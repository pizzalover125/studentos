const BASE_KEY = "student_os"

const MOCK_DATA = {
  classes: [
    { id: "review-class-1", name: "AP Calculus AB", description: "Mr. Patel · Room 204" },
    { id: "review-class-2", name: "Honors English", description: "Essay workshop + reading logs" },
    { id: "review-class-3", name: "AP Biology", description: "Lab report due Fridays" }
  ],
  homework: [
    { id: "review-hw-1", title: "Derivatives worksheet", subject: "AP Calculus AB", due_date: "2026-04-16", estimate_minutes: "45", status: "pending" },
    { id: "review-hw-2", title: "Chapter 8 reading notes", subject: "Honors English", due_date: "2026-04-17", estimate_minutes: "30", status: "not_started" },
    { id: "review-hw-3", title: "Cell transport diagrams", subject: "AP Biology", due_date: "2026-04-18", estimate_minutes: "35", status: "completed" }
  ],
  tests: [
    { id: "review-test-1", title: "Limits Quiz", subject: "AP Calculus AB", date: "2026-04-22", notes: "Practice FRQ #2 and #3" },
    { id: "review-test-2", title: "Vocabulary Check", subject: "Honors English", date: "2026-04-20", notes: "Units 9-10" }
  ],
  volunteer: [
    { id: "review-vol-1", organization: "City Food Bank", description: "Sorting + packing", date: "2026-04-06", hours: "2.5" },
    { id: "review-vol-2", organization: "Animal Shelter", description: "Dog walking", date: "2026-04-12", hours: "1.5" }
  ],
  extracurriculars: [
    { id: "review-extra-1", name: "Robotics Club", role: "Programmer", notes: "Drive team practice on Wednesdays" },
    { id: "review-extra-2", name: "Debate Team", role: "Varsity", notes: "Regional tournament prep" }
  ],
  extracurricular_logs: [
    { id: "review-log-1", extracurricular_id: "review-extra-1", description: "Autonomous code testing", date: "2026-04-10", hours: "2" },
    { id: "review-log-2", extracurricular_id: "review-extra-1", description: "Sensor calibration", date: "2026-04-12", hours: "1.5" },
    { id: "review-log-3", extracurricular_id: "review-extra-2", description: "Practice round", date: "2026-04-11", hours: "2" }
  ]
}

function reviewMode() {
  return document.documentElement?.dataset?.reviewMode === "true"
}

function storageNamespace() {
  return document.documentElement?.dataset?.storageNamespace
}

function namespacedKey(suffix) {
  const namespace = storageNamespace()
  const key = `${BASE_KEY}.${suffix}`
  return namespace ? `${key}.${namespace}` : key
}

function seedIfMissing(key, value) {
  try {
    const existing = JSON.parse(localStorage.getItem(key))
    if (Array.isArray(existing) && existing.length > 0) return
  } catch {
    // overwrite invalid payloads
  }

  localStorage.setItem(key, JSON.stringify(value))
}

if (reviewMode()) {
  seedIfMissing(namespacedKey("classes"), MOCK_DATA.classes)
  seedIfMissing(namespacedKey("homework"), MOCK_DATA.homework)
  seedIfMissing(namespacedKey("tests"), MOCK_DATA.tests)
  seedIfMissing(namespacedKey("volunteer"), MOCK_DATA.volunteer)
  seedIfMissing(namespacedKey("extracurriculars"), MOCK_DATA.extracurriculars)
  seedIfMissing(namespacedKey("extracurricular_logs"), MOCK_DATA.extracurricular_logs)
}
