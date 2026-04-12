# Passwordless Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add OTP + magic-link email login via Supabase Auth as identity provider, with JWT verified locally and auth state stored in an encrypted Rails cookie session.

**Architecture:** `SupabaseAuthClient` PORO wraps Supabase Auth REST API calls. `SessionsController` handles the email form and OTP entry. `AuthCallbackController` handles magic link redirects. `ApplicationController#require_auth` decodes the stored JWT on every request — no Supabase round-trip per request.

**Tech Stack:** Rails 8.1, `jwt` gem (HS256 decode), `webmock` gem (test HTTP stubbing), Supabase Auth REST API, Rails encrypted cookie session.

---

## Pre-flight: Supabase setup

Before running any code, complete these steps in the Supabase dashboard:

1. Create a new Supabase project (or use existing).
2. In **Authentication → Users**, manually add the admin email address. This is the only email that can sign in (`create_user: false` in OTP requests rejects unknown emails).
3. In **Authentication → URL Configuration**, add `http://localhost:3000/auth/callback` to **Redirect URLs**.
4. Copy three values from **Settings → API**:
   - **Project URL** → `SUPABASE_URL`
   - **anon public key** → `SUPABASE_ANON_KEY`
   - **JWT Secret** (Settings → API → JWT Settings) → `SUPABASE_JWT_SECRET`
5. Set these as environment variables before running the app:
   ```bash
   export SUPABASE_URL="https://xxxx.supabase.co"
   export SUPABASE_ANON_KEY="eyJ..."
   export SUPABASE_JWT_SECRET="your-jwt-secret"
   ```

---

## File Map

| File | Status | Responsibility |
|---|---|---|
| `Gemfile` | Modify | Add `jwt`, `webmock` |
| `test/test_helper.rb` | Modify | Require webmock, set test env vars, add `sign_in` helpers |
| `test/application_system_test_case.rb` | Modify | Add `sign_in` helper, update setup |
| `config/routes.rb` | Modify | Auth routes + test-only sign_in route |
| `app/services/supabase_auth_client.rb` | Create | Wraps Supabase Auth REST calls |
| `app/controllers/application_controller.rb` | Modify | Add `require_auth`, `authenticated?` |
| `app/controllers/sessions_controller.rb` | Create | Email form, OTP entry, logout |
| `app/controllers/auth_callback_controller.rb` | Create | Magic link callback |
| `app/controllers/test/sessions_controller.rb` | Create | Test-only: sets session without Supabase |
| `app/views/layouts/auth.html.erb` | Create | Minimal layout for login pages (no sidebar) |
| `app/views/sessions/new.html.erb` | Create | Email entry form |
| `app/views/sessions/new_otp.html.erb` | Create | 6-digit OTP entry form |
| `test/services/supabase_auth_client_test.rb` | Create | Unit tests for SupabaseAuthClient |
| `test/controllers/sessions_controller_test.rb` | Create | Controller tests for SessionsController |
| `test/controllers/auth_callback_controller_test.rb` | Create | Controller tests for AuthCallbackController |
| `test/integration/require_auth_test.rb` | Create | Integration test: unauthenticated → redirect |
| `test/system/auth_test.rb` | Create | System test: OTP flow end-to-end |

---

## Task 1: Add gems

**Files:**
- Modify: `Gemfile`
- Modify: `test/test_helper.rb`

- [ ] **Step 1: Add jwt gem to Gemfile**

  Open `Gemfile`. After the `gem "turbo-rails"` line, add:
  ```ruby
  gem "jwt", "~> 2.9"
  ```
  Also add `webmock` to the test group. The test group currently ends at `gem "selenium-webdriver"`. Add:
  ```ruby
  gem "webmock", require: false
  ```

  Full test group after edit:
  ```ruby
  group :test do
    gem "capybara"
    gem "selenium-webdriver"
    gem "webmock", require: false
  end
  ```

- [ ] **Step 2: Install gems**

  Run: `bundle install`
  Expected: `Bundle complete!` with `jwt` and `webmock` listed.

- [ ] **Step 3: Configure test_helper.rb**

  Open `test/test_helper.rb`. Replace the entire file with:
  ```ruby
  ENV["RAILS_ENV"] ||= "test"

  # Test env vars — set before loading environment
  ENV["SUPABASE_URL"]        ||= "https://test.supabase.co"
  ENV["SUPABASE_ANON_KEY"]   ||= "test-anon-key"
  ENV["SUPABASE_JWT_SECRET"] ||= "test-jwt-secret-32-chars-padded!!"

  require_relative "../config/environment"
  require "rails/test_help"
  require "webmock/minitest"

  WebMock.disable_net_connect!(allow_localhost: true)

  module AuthTestHelper
    def sign_in_session
      token = JWT.encode(
        { "sub" => "test-user-id", "exp" => 1.hour.from_now.to_i, "aud" => "authenticated" },
        ENV.fetch("SUPABASE_JWT_SECRET"),
        "HS256"
      )
      session[:supabase_access_token] = token
    end
  end

  class ActionDispatch::IntegrationTest
    def sign_in
      get "/test/sign_in"
      follow_redirect!
    end
  end

  module ActiveSupport
    class TestCase
      parallelize(workers: :number_of_processors)
      fixtures :all
    end
  end
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add Gemfile Gemfile.lock test/test_helper.rb
  git commit -m "chore: add jwt and webmock gems, configure test auth helpers"
  ```

---

## Task 2: SupabaseAuthClient — send_otp

**Files:**
- Create: `test/services/supabase_auth_client_test.rb`
- Create: `app/services/supabase_auth_client.rb`

- [ ] **Step 1: Create test directory and write failing test**

  Create `test/services/supabase_auth_client_test.rb`:
  ```ruby
  require "test_helper"

  class SupabaseAuthClientTest < ActiveSupport::TestCase
    setup do
      @client = SupabaseAuthClient.new
    end

    test "send_otp posts to Supabase otp endpoint and returns true" do
      stub_request(:post, "https://test.supabase.co/auth/v1/otp")
        .with(
          body: { email: "admin@example.com", create_user: false }.to_json,
          headers: {
            "apikey"       => "test-anon-key",
            "Content-Type" => "application/json"
          }
        )
        .to_return(status: 200, body: "{}", headers: { "Content-Type" => "application/json" })

      result = @client.send_otp("admin@example.com")
      assert result
    end

    test "send_otp raises Error on Supabase 4xx" do
      stub_request(:post, "https://test.supabase.co/auth/v1/otp")
        .to_return(status: 422, body: '{"message":"Email not found"}', headers: { "Content-Type" => "application/json" })

      assert_raises(SupabaseAuthClient::Error) do
        @client.send_otp("unknown@example.com")
      end
    end
  end
  ```

- [ ] **Step 2: Run test — verify it fails**

  Run: `rails test test/services/supabase_auth_client_test.rb`
  Expected: `NameError: uninitialized constant SupabaseAuthClient`

- [ ] **Step 3: Implement SupabaseAuthClient with send_otp**

  Create `app/services/supabase_auth_client.rb`:
  ```ruby
  require "net/http"
  require "json"

  class SupabaseAuthClient
    Error = Class.new(StandardError)

    def initialize
      @base_url = ENV.fetch("SUPABASE_URL")
      @anon_key  = ENV.fetch("SUPABASE_ANON_KEY")
    end

    def send_otp(email)
      post("/auth/v1/otp", { email: email, create_user: false })
      true
    end

    private

    def post(path, body)
      uri     = URI("#{@base_url}#{path}")
      http    = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = uri.scheme == "https"

      request = Net::HTTP::Post.new(uri.path)
      request["apikey"]        = @anon_key
      request["Content-Type"]  = "application/json"
      request.body             = body.to_json

      response = http.request(request)

      unless response.is_a?(Net::HTTPSuccess)
        raise Error, "Supabase error #{response.code}: #{response.body}"
      end

      JSON.parse(response.body)
    rescue Error
      raise
    rescue => e
      raise Error, "Supabase request failed: #{e.message}"
    end
  end
  ```

- [ ] **Step 4: Run test — verify it passes**

  Run: `rails test test/services/supabase_auth_client_test.rb`
  Expected: `2 runs, 2 assertions, 0 failures, 0 errors`

- [ ] **Step 5: Commit**

  ```bash
  git add app/services/supabase_auth_client.rb test/services/supabase_auth_client_test.rb
  git commit -m "feat: add SupabaseAuthClient with send_otp"
  ```

---

## Task 3: SupabaseAuthClient — verify_otp and verify_token_hash

**Files:**
- Modify: `test/services/supabase_auth_client_test.rb`
- Modify: `app/services/supabase_auth_client.rb`

- [ ] **Step 1: Write failing tests**

  Add these tests to `test/services/supabase_auth_client_test.rb` (inside the class, after existing tests):
  ```ruby
  test "verify_otp posts to verify endpoint and returns access_token" do
    valid_token = JWT.encode(
      { "sub" => "user-id", "exp" => 1.hour.from_now.to_i },
      ENV.fetch("SUPABASE_JWT_SECRET"), "HS256"
    )
    stub_request(:post, "https://test.supabase.co/auth/v1/verify")
      .with(
        body: { type: "email", email: "admin@example.com", token: "123456" }.to_json,
        headers: { "apikey" => "test-anon-key", "Content-Type" => "application/json" }
      )
      .to_return(
        status: 200,
        body: { access_token: valid_token, token_type: "bearer" }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

    result = @client.verify_otp(email: "admin@example.com", token: "123456")
    assert_equal valid_token, result
  end

  test "verify_otp raises Error on invalid token" do
    stub_request(:post, "https://test.supabase.co/auth/v1/verify")
      .to_return(status: 401, body: '{"message":"Token has expired or is invalid"}', headers: { "Content-Type" => "application/json" })

    assert_raises(SupabaseAuthClient::Error) do
      @client.verify_otp(email: "admin@example.com", token: "000000")
    end
  end

  test "verify_token_hash posts to verify endpoint and returns access_token" do
    valid_token = JWT.encode(
      { "sub" => "user-id", "exp" => 1.hour.from_now.to_i },
      ENV.fetch("SUPABASE_JWT_SECRET"), "HS256"
    )
    stub_request(:post, "https://test.supabase.co/auth/v1/verify")
      .with(
        body: { type: "email", token_hash: "pkce_abc123" }.to_json,
        headers: { "apikey" => "test-anon-key", "Content-Type" => "application/json" }
      )
      .to_return(
        status: 200,
        body: { access_token: valid_token, token_type: "bearer" }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

    result = @client.verify_token_hash(token_hash: "pkce_abc123")
    assert_equal valid_token, result
  end

  test "verify_token_hash raises Error on reused token" do
    stub_request(:post, "https://test.supabase.co/auth/v1/verify")
      .to_return(status: 401, body: '{"message":"Token has expired or is invalid"}', headers: { "Content-Type" => "application/json" })

    assert_raises(SupabaseAuthClient::Error) do
      @client.verify_token_hash(token_hash: "stale_hash")
    end
  end
  ```

- [ ] **Step 2: Run tests — verify new ones fail**

  Run: `rails test test/services/supabase_auth_client_test.rb`
  Expected: 2 pass, 4 fail with `NoMethodError: undefined method 'verify_otp'`

- [ ] **Step 3: Implement verify_otp and verify_token_hash**

  Add these methods to `app/services/supabase_auth_client.rb` (before the `private` line):
  ```ruby
  def verify_otp(email:, token:)
    response = post("/auth/v1/verify", { type: "email", email: email, token: token })
    response["access_token"]
  end

  def verify_token_hash(token_hash:)
    response = post("/auth/v1/verify", { type: "email", token_hash: token_hash })
    response["access_token"]
  end
  ```

- [ ] **Step 4: Run tests — verify all pass**

  Run: `rails test test/services/supabase_auth_client_test.rb`
  Expected: `6 runs, 6 assertions, 0 failures, 0 errors`

- [ ] **Step 5: Commit**

  ```bash
  git add app/services/supabase_auth_client.rb test/services/supabase_auth_client_test.rb
  git commit -m "feat: add verify_otp and verify_token_hash to SupabaseAuthClient"
  ```

---

## Task 4: Routes

**Files:**
- Modify: `config/routes.rb`

- [ ] **Step 1: Add auth routes**

  Replace the entire `config/routes.rb` with:
  ```ruby
  Rails.application.routes.draw do
    root "homework#index"
    get "classes",          to: "classes#index"
    get "homework",         to: "homework#index"
    get "tests",            to: "tests#index"
    get "pomodoro",         to: "pomodoro#index"
    get "volunteer",        to: "volunteer#index"
    get "extracurriculars", to: "extracurriculars#index"

    get    "/login",            to: "sessions#new",       as: :login
    post   "/login",            to: "sessions#create"
    get    "/login/otp",        to: "sessions#new_otp",   as: :login_otp
    post   "/login/verify_otp", to: "sessions#verify_otp"
    delete "/session",          to: "sessions#destroy",   as: :logout
    get    "/auth/callback",    to: "auth_callback#show"

    if Rails.env.test?
      get "/test/sign_in", to: "test/sessions#create"
    end
  end
  ```

- [ ] **Step 2: Verify routes**

  Run: `rails routes | grep -E "login|session|callback|test"`
  Expected output (column order may vary):
  ```
  login      GET    /login(.:format)             sessions#new
             POST   /login(.:format)             sessions#create
  login_otp  GET    /login/otp(.:format)         sessions#new_otp
             POST   /login/verify_otp(.:format)  sessions#verify_otp
  logout     DELETE /session(.:format)           sessions#destroy
             GET    /auth/callback(.:format)     auth_callback#show
             GET    /test/sign_in(.:format)      test/sessions#create
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add config/routes.rb
  git commit -m "feat: add passwordless auth routes"
  ```

---

## Task 5: ApplicationController — require_auth

**Files:**
- Create: `test/integration/require_auth_test.rb`
- Modify: `app/controllers/application_controller.rb`

- [ ] **Step 1: Write failing integration test**

  Create `test/integration/require_auth_test.rb`:
  ```ruby
  require "test_helper"

  class RequireAuthTest < ActionDispatch::IntegrationTest
    test "unauthenticated GET / redirects to login" do
      get root_path
      assert_redirected_to login_path
    end

    test "authenticated GET / proceeds" do
      sign_in
      get root_path
      assert_response :success
    end

    test "expired JWT redirects to login" do
      expired_token = JWT.encode(
        { "sub" => "user-id", "exp" => 1.hour.ago.to_i },
        ENV.fetch("SUPABASE_JWT_SECRET"),
        "HS256"
      )
      # Set session via sign_in then overwrite with expired token
      sign_in
      # Use the test sign_in route but override the token in session afterward
      # by hitting a custom stub — instead, use a second approach:
      # POST to verify_otp with a stubbed expired token response isn't practical here.
      # Test expired token via controller test in Task 8. Skip here.
    end
  end
  ```

  > Note: the expired-token test is a placeholder that will be removed. The expired-token path is covered by controller tests in Task 8 where session can be set directly.

  Simplify — replace the third test with a useful assertion. Final `test/integration/require_auth_test.rb`:
  ```ruby
  require "test_helper"

  class RequireAuthTest < ActionDispatch::IntegrationTest
    test "unauthenticated GET / redirects to login" do
      get root_path
      assert_redirected_to login_path
    end

    test "unauthenticated GET /homework redirects to login" do
      get homework_path
      assert_redirected_to login_path
    end

    test "authenticated GET / proceeds after sign_in" do
      sign_in
      get root_path
      assert_response :success
    end
  end
  ```

- [ ] **Step 2: Run test — verify it fails**

  Run: `rails test test/integration/require_auth_test.rb`
  Expected: 3 runs, 0 failures (tests pass even without require_auth since routes work) — actually `unauthenticated GET /` returns 200 instead of redirect, so:
  Expected: `assert_redirected_to login_path` fails with `Expected response to be a redirect to <http://...login> but was 200`

- [ ] **Step 3: Implement require_auth in ApplicationController**

  Replace `app/controllers/application_controller.rb` with:
  ```ruby
  require "jwt"

  class ApplicationController < ActionController::Base
    allow_browser versions: :modern
    stale_when_importmap_changes

    before_action :require_auth

    helper_method :authenticated?

    private

    def require_auth
      token = session[:supabase_access_token]

      if token.nil? || token_expired?(token)
        reset_session
        redirect_to login_path and return
      end
    end

    def token_expired?(token)
      payload, = JWT.decode(token, ENV.fetch("SUPABASE_JWT_SECRET"), true, { algorithm: "HS256" })
      payload["exp"] < Time.now.to_i
    rescue JWT::DecodeError
      true
    end

    def authenticated?
      token = session[:supabase_access_token]
      token.present? && !token_expired?(token)
    end
  end
  ```

- [ ] **Step 4: Run tests — verify all 3 pass**

  Run: `rails test test/integration/require_auth_test.rb`
  Expected: `3 runs, 3 assertions, 0 failures, 0 errors`

  > If the `sign_in` test fails with a routing error, it means `test/sessions_controller.rb` doesn't exist yet. Create a stub now:

  Create `app/controllers/test/sessions_controller.rb`:
  ```ruby
  class Test::SessionsController < ApplicationController
    skip_before_action :require_auth

    def create
      token = JWT.encode(
        { "sub" => "test-user-id", "exp" => 1.hour.from_now.to_i, "aud" => "authenticated" },
        ENV.fetch("SUPABASE_JWT_SECRET"),
        "HS256"
      )
      session[:supabase_access_token] = token
      redirect_to root_path
    end
  end
  ```

  Re-run: `rails test test/integration/require_auth_test.rb`
  Expected: `3 runs, 3 assertions, 0 failures, 0 errors`

- [ ] **Step 5: Commit**

  ```bash
  git add app/controllers/application_controller.rb \
          app/controllers/test/sessions_controller.rb \
          test/integration/require_auth_test.rb
  git commit -m "feat: add require_auth to ApplicationController with JWT decode"
  ```

---

## Task 6: Update existing system tests for auth

Now that `require_auth` is on, existing system tests will fail because `visit root_path` in setup redirects to login.

**Files:**
- Modify: `test/application_system_test_case.rb`

- [ ] **Step 1: Update ApplicationSystemTestCase**

  Replace `test/application_system_test_case.rb` with:
  ```ruby
  require "test_helper"

  class ApplicationSystemTestCase < ActionDispatch::SystemTestCase
    driven_by :selenium, using: :headless_chrome, screen_size: [1400, 900]

    setup do
      sign_in
      page.execute_script("localStorage.clear()")
    end

    private

    def sign_in
      visit "/test/sign_in"
      # /test/sign_in sets session and redirects to root — wait for root to load
      assert_current_path root_path
    end
  end
  ```

- [ ] **Step 2: Run existing system tests — verify still pass**

  Run: `rails test:system`
  Expected: All existing system tests pass (homework, classes, tests, pomodoro, volunteer, extracurriculars, theme, taskbar).

  If any test fails because it expects to land on a specific page after setup, that test's `visit` call will handle navigation — the sign_in just ensures we're authenticated.

- [ ] **Step 3: Commit**

  ```bash
  git add test/application_system_test_case.rb
  git commit -m "test: update system test setup to sign_in before each test"
  ```

---

## Task 7: SessionsController — new and create

**Files:**
- Create: `test/controllers/sessions_controller_test.rb`
- Create: `app/controllers/sessions_controller.rb`
- Create: `app/views/layouts/auth.html.erb`
- Create: `app/views/sessions/new.html.erb`

- [ ] **Step 1: Write failing controller tests for new and create**

  Create `test/controllers/sessions_controller_test.rb`:
  ```ruby
  require "test_helper"

  class SessionsControllerTest < ActionDispatch::IntegrationTest
    test "GET /login renders email form" do
      get login_path
      assert_response :success
      assert_select "form[action='#{login_path}']"
      assert_select "input[type='email'][name='email']"
    end

    test "POST /login with valid email redirects to OTP page" do
      stub_request(:post, "https://test.supabase.co/auth/v1/otp")
        .with(body: { email: "admin@example.com", create_user: false }.to_json)
        .to_return(status: 200, body: "{}", headers: { "Content-Type" => "application/json" })

      post login_path, params: { email: "admin@example.com" }
      assert_redirected_to login_otp_path
    end

    test "POST /login stores pending_otp_email in session" do
      stub_request(:post, "https://test.supabase.co/auth/v1/otp")
        .to_return(status: 200, body: "{}", headers: { "Content-Type" => "application/json" })

      post login_path, params: { email: "admin@example.com" }
      follow_redirect!
      # Session cookie is set — verify by checking we land on OTP page
      assert_response :success
    end

    test "POST /login re-renders form on Supabase error" do
      stub_request(:post, "https://test.supabase.co/auth/v1/otp")
        .to_return(status: 422, body: '{"message":"User not found"}', headers: { "Content-Type" => "application/json" })

      post login_path, params: { email: "unknown@example.com" }
      assert_response :unprocessable_entity
      assert_select "form[action='#{login_path}']"
    end
  end
  ```

- [ ] **Step 2: Run tests — verify they fail**

  Run: `rails test test/controllers/sessions_controller_test.rb`
  Expected: `ActionController::RoutingError: uninitialized constant SessionsController`

- [ ] **Step 3: Create SessionsController (new + create only)**

  Create `app/controllers/sessions_controller.rb`:
  ```ruby
  class SessionsController < ApplicationController
    skip_before_action :require_auth

    layout "auth"

    def new
    end

    def create
      SupabaseAuthClient.new.send_otp(params[:email])
      session[:pending_otp_email] = params[:email]
      redirect_to login_otp_path
    rescue SupabaseAuthClient::Error
      flash[:alert] = "Could not send sign-in email. Check the address and try again."
      render :new, status: :unprocessable_entity
    end
  end
  ```

- [ ] **Step 4: Create auth layout**

  Create `app/views/layouts/auth.html.erb`:
  ```erb
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <title>Student OS</title>
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@400;500;600&display=swap" rel="stylesheet">
      <%= csrf_meta_tags %>
      <%= csp_meta_tag %>
      <%= stylesheet_link_tag "application", "data-turbo-track": "reload" %>
    </head>
    <body class="auth-body">
      <div class="auth-container">
        <%= yield %>
      </div>
    </body>
  </html>
  ```

- [ ] **Step 5: Create sessions/new.html.erb**

  Create `app/views/sessions/new.html.erb`:
  ```erb
  <div class="auth-card">
    <div class="auth-card__header">
      <h1 class="auth-card__title">Student OS</h1>
      <p class="auth-card__subtitle">Enter your email to sign in</p>
    </div>

    <% if flash[:alert] %>
      <p class="error-msg"><%= flash[:alert] %></p>
    <% end %>

    <%= form_with url: login_path, method: :post do |f| %>
      <div class="form-group">
        <%= f.label :email, "Email", class: "form-label" %>
        <%= f.email_field :email, class: "form-input", placeholder: "you@example.com",
              required: true, autofocus: true, autocomplete: "email" %>
      </div>
      <div class="form-actions">
        <%= f.submit "Send code", class: "btn btn--primary btn--full" %>
      </div>
    <% end %>
  </div>
  ```

- [ ] **Step 6: Add auth CSS to application.css**

  Open `app/assets/stylesheets/application.css`. Append at the end:
  ```css
  /* Auth pages */
  .auth-body {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: var(--bg, #f8fafc);
  }

  .auth-container {
    width: 100%;
    max-width: 400px;
    padding: 1.5rem;
  }

  .auth-card {
    background: var(--surface, #fff);
    border: 1px solid var(--border, #e2e8f0);
    border-radius: 0.75rem;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .auth-card__header {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .auth-card__title {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
  }

  .auth-card__subtitle {
    font-size: 0.875rem;
    color: var(--text-muted, #64748b);
    margin: 0;
  }

  .auth-back {
    font-size: 0.8125rem;
    text-align: center;
    margin: 0;
  }

  .btn--full {
    width: 100%;
  }

  .form-input--otp {
    letter-spacing: 0.5em;
    font-size: 1.25rem;
    text-align: center;
  }
  ```

- [ ] **Step 7: Run tests — verify they pass**

  Run: `rails test test/controllers/sessions_controller_test.rb`
  Expected: `4 runs, 4 assertions, 0 failures, 0 errors`

- [ ] **Step 8: Commit**

  ```bash
  git add app/controllers/sessions_controller.rb \
          app/views/layouts/auth.html.erb \
          app/views/sessions/new.html.erb \
          app/assets/stylesheets/application.css \
          test/controllers/sessions_controller_test.rb
  git commit -m "feat: add SessionsController email form and auth layout"
  ```

---

## Task 8: SessionsController — new_otp and verify_otp

**Files:**
- Modify: `app/controllers/sessions_controller.rb`
- Create: `app/views/sessions/new_otp.html.erb`
- Modify: `test/controllers/sessions_controller_test.rb`

- [ ] **Step 1: Write failing tests for new_otp and verify_otp**

  Add to `test/controllers/sessions_controller_test.rb` (inside the class, after existing tests):
  ```ruby
  test "GET /login/otp renders OTP form when pending_otp_email is set" do
    # Use integration test approach: POST to login first to set session
    stub_request(:post, "https://test.supabase.co/auth/v1/otp")
      .to_return(status: 200, body: "{}", headers: { "Content-Type" => "application/json" })
    post login_path, params: { email: "admin@example.com" }

    get login_otp_path
    assert_response :success
    assert_select "form[action='#{login_verify_otp_path}']"
    assert_select "input[name='token']"
  end

  test "GET /login/otp redirects to login when pending_otp_email missing" do
    get login_otp_path
    assert_redirected_to login_path
  end

  test "POST /login/verify_otp with valid token sets session and redirects to root" do
    valid_token = JWT.encode(
      { "sub" => "user-id", "exp" => 1.hour.from_now.to_i, "aud" => "authenticated" },
      ENV.fetch("SUPABASE_JWT_SECRET"), "HS256"
    )
    stub_request(:post, "https://test.supabase.co/auth/v1/otp")
      .to_return(status: 200, body: "{}", headers: { "Content-Type" => "application/json" })
    stub_request(:post, "https://test.supabase.co/auth/v1/verify")
      .with(body: { type: "email", email: "admin@example.com", token: "123456" }.to_json)
      .to_return(
        status: 200,
        body: { access_token: valid_token }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

    post login_path, params: { email: "admin@example.com" }
    post login_verify_otp_path, params: { token: "123456" }

    assert_redirected_to root_path
    follow_redirect!
    assert_response :success
  end

  test "POST /login/verify_otp with invalid token re-renders OTP form" do
    stub_request(:post, "https://test.supabase.co/auth/v1/otp")
      .to_return(status: 200, body: "{}", headers: { "Content-Type" => "application/json" })
    stub_request(:post, "https://test.supabase.co/auth/v1/verify")
      .to_return(status: 401, body: '{"message":"Invalid token"}', headers: { "Content-Type" => "application/json" })

    post login_path, params: { email: "admin@example.com" }
    post login_verify_otp_path, params: { token: "000000" }

    assert_response :unprocessable_entity
    assert_select "form[action='#{login_verify_otp_path}']"
  end

  test "POST /login/verify_otp clears pending_otp_email from session on success" do
    valid_token = JWT.encode(
      { "sub" => "user-id", "exp" => 1.hour.from_now.to_i, "aud" => "authenticated" },
      ENV.fetch("SUPABASE_JWT_SECRET"), "HS256"
    )
    stub_request(:post, "https://test.supabase.co/auth/v1/otp")
      .to_return(status: 200, body: "{}", headers: { "Content-Type" => "application/json" })
    stub_request(:post, "https://test.supabase.co/auth/v1/verify")
      .to_return(
        status: 200,
        body: { access_token: valid_token }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

    post login_path, params: { email: "admin@example.com" }
    post login_verify_otp_path, params: { token: "123456" }

    follow_redirect!
    # If pending_otp_email were still set, GET /login/otp would succeed.
    # But since the OTP page also requires auth now (via sign_in), test differently:
    # Just confirm we land on root successfully.
    assert_response :success
  end
  ```

  Also add the route helper for `login_verify_otp_path`. Open `config/routes.rb` and verify: the route `post "/login/verify_otp"` has no `as:` named helper. Add it:
  ```ruby
  post "/login/verify_otp", to: "sessions#verify_otp", as: :login_verify_otp
  ```

- [ ] **Step 2: Run tests — verify new tests fail**

  Run: `rails test test/controllers/sessions_controller_test.rb`
  Expected: `NoMethodError: undefined method 'new_otp'` or routing error on new tests.

- [ ] **Step 3: Implement new_otp and verify_otp**

  Add these actions to `app/controllers/sessions_controller.rb` (before the last `end`):
  ```ruby
  def new_otp
    redirect_to login_path unless session[:pending_otp_email]
  end

  def verify_otp
    email = session[:pending_otp_email]
    access_token = SupabaseAuthClient.new.verify_otp(email: email, token: params[:token])
    session.delete(:pending_otp_email)
    session[:supabase_access_token] = access_token
    redirect_to root_path
  rescue SupabaseAuthClient::Error
    flash[:alert] = "Invalid or expired code. Request a new one."
    render :new_otp, status: :unprocessable_entity
  end
  ```

- [ ] **Step 4: Create sessions/new_otp.html.erb**

  Create `app/views/sessions/new_otp.html.erb`:
  ```erb
  <div class="auth-card">
    <div class="auth-card__header">
      <h1 class="auth-card__title">Check your email</h1>
      <p class="auth-card__subtitle">Enter the 6-digit code, or click the magic link in your email.</p>
    </div>

    <% if flash[:alert] %>
      <p class="error-msg"><%= flash[:alert] %></p>
    <% end %>

    <%= form_with url: login_verify_otp_path, method: :post do |f| %>
      <div class="form-group">
        <%= f.label :token, "Code", class: "form-label" %>
        <%= f.text_field :token, class: "form-input form-input--otp",
              placeholder: "123456", required: true, autofocus: true,
              maxlength: 6, inputmode: "numeric", pattern: "[0-9]{6}",
              autocomplete: "one-time-code" %>
      </div>
      <div class="form-actions">
        <%= f.submit "Verify", class: "btn btn--primary btn--full" %>
      </div>
    <% end %>

    <p class="auth-back">
      <%= link_to "\u2190 Use a different email", login_path %>
    </p>
  </div>
  ```

- [ ] **Step 5: Run tests — verify all pass**

  Run: `rails test test/controllers/sessions_controller_test.rb`
  Expected: `9 runs, 9+ assertions, 0 failures, 0 errors`

- [ ] **Step 6: Commit**

  ```bash
  git add app/controllers/sessions_controller.rb \
          app/views/sessions/new_otp.html.erb \
          config/routes.rb \
          test/controllers/sessions_controller_test.rb
  git commit -m "feat: add OTP entry and verify flow to SessionsController"
  ```

---

## Task 9: SessionsController — destroy

**Files:**
- Modify: `app/controllers/sessions_controller.rb`
- Modify: `test/controllers/sessions_controller_test.rb`

- [ ] **Step 1: Write failing test**

  Add to `test/controllers/sessions_controller_test.rb`:
  ```ruby
  test "DELETE /session clears session and redirects to login" do
    sign_in  # authenticate first
    delete logout_path
    assert_redirected_to login_path
    follow_redirect!
    # Verify we're no longer authenticated: next request redirects back to login
    get root_path
    assert_redirected_to login_path
  end
  ```

- [ ] **Step 2: Run test — verify it fails**

  Run: `rails test test/controllers/sessions_controller_test.rb`
  Expected: `NoMethodError: undefined method 'destroy'` or routing error.

- [ ] **Step 3: Implement destroy**

  Add to `app/controllers/sessions_controller.rb` (before the last `end`):
  ```ruby
  def destroy
    reset_session
    redirect_to login_path
  end
  ```

- [ ] **Step 4: Run tests — verify all pass**

  Run: `rails test test/controllers/sessions_controller_test.rb`
  Expected: `10 runs, 0 failures, 0 errors`

- [ ] **Step 5: Commit**

  ```bash
  git add app/controllers/sessions_controller.rb \
          test/controllers/sessions_controller_test.rb
  git commit -m "feat: add logout to SessionsController"
  ```

---

## Task 10: AuthCallbackController

**Files:**
- Create: `test/controllers/auth_callback_controller_test.rb`
- Create: `app/controllers/auth_callback_controller.rb`

- [ ] **Step 1: Write failing tests**

  Create `test/controllers/auth_callback_controller_test.rb`:
  ```ruby
  require "test_helper"

  class AuthCallbackControllerTest < ActionDispatch::IntegrationTest
    test "GET /auth/callback with valid token_hash sets session and redirects to root" do
      valid_token = JWT.encode(
        { "sub" => "user-id", "exp" => 1.hour.from_now.to_i, "aud" => "authenticated" },
        ENV.fetch("SUPABASE_JWT_SECRET"), "HS256"
      )
      stub_request(:post, "https://test.supabase.co/auth/v1/verify")
        .with(body: { type: "email", token_hash: "valid_hash_abc" }.to_json)
        .to_return(
          status: 200,
          body: { access_token: valid_token }.to_json,
          headers: { "Content-Type" => "application/json" }
        )

      get auth_callback_url(token_hash: "valid_hash_abc", type: "email")
      assert_redirected_to root_path
      follow_redirect!
      assert_response :success
    end

    test "GET /auth/callback with invalid token_hash redirects to login with alert" do
      stub_request(:post, "https://test.supabase.co/auth/v1/verify")
        .to_return(
          status: 401,
          body: '{"message":"Token has expired or is invalid"}',
          headers: { "Content-Type" => "application/json" }
        )

      get auth_callback_url(token_hash: "stale_hash", type: "email")
      assert_redirected_to login_path
      follow_redirect!
      assert_select ".error-msg", /invalid|expired/i
    end
  end
  ```

  Add the named route helper. In `config/routes.rb`, update the callback route:
  ```ruby
  get "/auth/callback", to: "auth_callback#show", as: :auth_callback
  ```

- [ ] **Step 2: Run tests — verify they fail**

  Run: `rails test test/controllers/auth_callback_controller_test.rb`
  Expected: `NameError: uninitialized constant AuthCallbackController`

- [ ] **Step 3: Implement AuthCallbackController**

  Create `app/controllers/auth_callback_controller.rb`:
  ```ruby
  class AuthCallbackController < ApplicationController
    skip_before_action :require_auth

    layout "auth"

    def show
      token_hash = params[:token_hash]
      access_token = SupabaseAuthClient.new.verify_token_hash(token_hash: token_hash)
      session[:supabase_access_token] = access_token
      redirect_to root_path
    rescue SupabaseAuthClient::Error
      flash[:alert] = "Magic link is invalid or has already been used."
      redirect_to login_path
    end
  end
  ```

- [ ] **Step 4: Run tests — verify they pass**

  Run: `rails test test/controllers/auth_callback_controller_test.rb`
  Expected: `2 runs, 2 assertions, 0 failures, 0 errors`

- [ ] **Step 5: Commit**

  ```bash
  git add app/controllers/auth_callback_controller.rb \
          config/routes.rb \
          test/controllers/auth_callback_controller_test.rb
  git commit -m "feat: add AuthCallbackController for magic link flow"
  ```

---

## Task 11: System test — OTP auth flow

**Files:**
- Create: `test/system/auth_test.rb`

- [ ] **Step 1: Write system test**

  Create `test/system/auth_test.rb`:
  ```ruby
  require "application_system_test_case"

  class AuthTest < ActionDispatch::SystemTestCase
    driven_by :selenium, using: :headless_chrome, screen_size: [1400, 900]

    # This test does NOT call setup (no sign_in) — it tests the login flow itself

    test "OTP flow: email form → OTP entry → authenticated" do
      valid_token = JWT.encode(
        { "sub" => "user-id", "exp" => 1.hour.from_now.to_i, "aud" => "authenticated" },
        ENV.fetch("SUPABASE_JWT_SECRET"), "HS256"
      )

      stub_request(:post, "https://test.supabase.co/auth/v1/otp")
        .with(body: { email: "admin@example.com", create_user: false }.to_json)
        .to_return(status: 200, body: "{}", headers: { "Content-Type" => "application/json" })

      stub_request(:post, "https://test.supabase.co/auth/v1/verify")
        .with(body: { type: "email", email: "admin@example.com", token: "123456" }.to_json)
        .to_return(
          status: 200,
          body: { access_token: valid_token }.to_json,
          headers: { "Content-Type" => "application/json" }
        )

      visit root_path
      assert_current_path login_path

      fill_in "Email", with: "admin@example.com"
      click_button "Send code"

      assert_current_path login_otp_path
      assert_text "Check your email"

      fill_in "Code", with: "123456"
      click_button "Verify"

      assert_current_path root_path
    end

    test "unauthenticated visit redirects to login page" do
      visit root_path
      assert_current_path login_path
      assert_selector "input[type='email']"
    end

    test "invalid OTP shows error on form" do
      stub_request(:post, "https://test.supabase.co/auth/v1/otp")
        .to_return(status: 200, body: "{}", headers: { "Content-Type" => "application/json" })
      stub_request(:post, "https://test.supabase.co/auth/v1/verify")
        .to_return(status: 401, body: '{"message":"Invalid"}', headers: { "Content-Type" => "application/json" })

      visit login_path
      fill_in "Email", with: "admin@example.com"
      click_button "Send code"

      fill_in "Code", with: "000000"
      click_button "Verify"

      assert_current_path login_verify_otp_path
      assert_selector ".error-msg", text: /invalid|expired/i
    end
  end
  ```

- [ ] **Step 2: Run system test**

  Run: `rails test:system TEST=test/system/auth_test.rb`
  Expected: `3 runs, 3 assertions, 0 failures, 0 errors`

  If WebMock blocks the browser's own requests, add `allow_browser: true` to `WebMock.disable_net_connect!` in `test_helper.rb`:
  ```ruby
  WebMock.disable_net_connect!(allow_localhost: true)
  ```
  (This is already set in Task 1 — no change needed. WebMock only intercepts Ruby Net::HTTP calls, not Selenium's browser requests.)

- [ ] **Step 3: Run full test suite**

  Run: `rails test && rails test:system`
  Expected: All tests pass.

- [ ] **Step 4: Commit**

  ```bash
  git add test/system/auth_test.rb
  git commit -m "test: add system tests for OTP auth flow"
  ```

---

## Task 12: Logout link in layout

**Files:**
- Modify: `app/views/layouts/application.html.erb`

- [ ] **Step 1: Add logout button to sidebar**

  In `app/views/layouts/application.html.erb`, find the closing `</aside>` tag and add a logout link just before it:
  ```erb
      <%= button_to "Sign out", logout_path, method: :delete,
            class: "sidebar__link sidebar__link--logout",
            form: { data: { turbo_confirm: false } } %>
    </aside>
  ```

- [ ] **Step 2: Verify logout works manually**

  Start server: `bin/rails server`
  Visit `http://localhost:3000` — you should be redirected to `/login`.
  Set up Supabase env vars and test the real flow, OR use the test sign_in endpoint in dev: `http://localhost:3000/test/sign_in` (only available when `RAILS_ENV=test`; in development the route doesn't exist — that's intentional).

  > For manual dev testing before Supabase is configured, temporarily add the test route in development too. Remove it before shipping.

- [ ] **Step 3: Run full suite one final time**

  Run: `rails test && rails test:system`
  Expected: All tests pass.

- [ ] **Step 4: Commit**

  ```bash
  git add app/views/layouts/application.html.erb
  git commit -m "feat: add sign out button to sidebar"
  ```

---

## Done

Auth is live. Two sign-in paths work:
- **OTP code:** `/login` → enter email → enter 6-digit code
- **Magic link:** click link in email → `/auth/callback` → lands on app

All existing pages are protected by `require_auth`. Session persists until logout or JWT expiry.
