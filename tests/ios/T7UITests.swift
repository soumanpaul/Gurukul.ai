import XCTest

@MainActor
final class T7UITests: XCTestCase {
  let app = XCUIApplication(bundleIdentifier: "org.gurukul.t0")

  override func setUpWithError() throws {
    continueAfterFailure = false
  }

  func finishSplash() {
    if app.buttons["Next splash"].waitForExistence(timeout: 5) {
      reach("Next splash").tap()
      reach("Get Started").tap()
    }
  }

  func testSplashStartupAndLogout() throws {
    app.launch()
    XCTAssertTrue(app.buttons["Next splash"].waitForExistence(timeout: 20))
    XCTAssertTrue(app.buttons["Next splash"].isHittable)
    let first = XCTAttachment(screenshot: app.screenshot())
    first.name = "First book splash"
    first.lifetime = .keepAlways
    add(first)
    app.buttons["Next splash"].tap()
    XCTAssertTrue(app.buttons["Get Started"].waitForExistence(timeout: 5))
    XCTAssertTrue(app.buttons["Get Started"].isHittable)
    app.buttons["Back to first splash"].tap()
    XCTAssertTrue(app.buttons["Next splash"].exists)
    app.buttons["Next splash"].tap()
    let second = XCTAttachment(screenshot: app.screenshot())
    second.name = "Second robot splash"
    second.lifetime = .keepAlways
    add(second)
    app.buttons["Get Started"].tap()
    if app.textFields["Nickname"].waitForExistence(timeout: 3) { reach("Continue offline").tap() }
    if app.staticTexts["Meet your digital teacher"].waitForExistence(timeout: 3) {
      XCTAssertTrue(app.buttons["Continue with my teacher"].waitForExistence(timeout: 60))
      reach("Continue with my teacher").tap()
    }
    XCTAssertTrue(app.buttons["View all notebooks"].waitForExistence(timeout: 20))
    app.otherElements["Settings"].firstMatch.tap()
    reach("Log out").tap()
    app.alerts.buttons["Cancel"].tap()
    XCTAssertFalse(app.buttons["Next splash"].exists)
    reach("Log out").tap()
    app.alerts.buttons["Log out"].tap()
    XCTAssertTrue(app.buttons["Next splash"].waitForExistence(timeout: 10))
    finishSplash()
    XCTAssertTrue(app.textFields["Nickname"].waitForExistence(timeout: 10))
    let name = app.textFields["Nickname"].value as? String
    app.terminate()
    app.launch()
    XCTAssertTrue(app.buttons["Next splash"].waitForExistence(timeout: 20))
    finishSplash()
    XCTAssertTrue(app.textFields["Nickname"].waitForExistence(timeout: 10))
    XCTAssertEqual(app.textFields["Nickname"].value as? String, name)
    reach("Continue offline").tap()
    XCTAssertTrue(app.buttons["Continue with my teacher"].waitForExistence(timeout: 60))
    reach("Continue with my teacher").tap()
    XCTAssertTrue(app.buttons["View all notebooks"].waitForExistence(timeout: 10))
  }

  func reach(_ label: String) -> XCUIElement {
    let element = app.buttons[label].firstMatch
    for _ in 0..<18 {
      if element.exists && element.isHittable { return element }
      app.scrollViews.firstMatch.swipeUp()
    }
    XCTAssertTrue(element.exists, "Expected labeled action")
    XCTAssertTrue(element.isHittable, "Action must be reachable")
    return element
  }

  func testSyntheticNotebookKeyboardAndConfirmedDeletion() throws {
    app.launch()
    finishSplash()
    XCTAssertTrue(app.buttons["View all notebooks"].waitForExistence(timeout: 20))
    app.buttons["View all notebooks"].tap()
    XCTAssertTrue(app.buttons["Create notebook"].waitForExistence(timeout: 20))
    app.buttons["Create notebook"].tap()
    let name = "T7 UI disposable " + UUID().uuidString.prefix(8)
    let field = app.textFields["Notebook name"]
    XCTAssertTrue(field.waitForExistence(timeout: 5))
    field.tap()
    for character in name {
      field.typeText(String(character))
    }
    XCTAssertEqual(field.value as? String, name)
    XCTAssertTrue(app.keyboards.firstMatch.exists)
    let create = app.buttons["Create notebook"].firstMatch
    XCTAssertTrue(create.isEnabled)
    XCTAssertTrue(create.isHittable, "Create must stay above the keyboard")
    create.tap()
    XCTAssertTrue(app.otherElements["History"].firstMatch.waitForExistence(timeout: 10))
    app.otherElements["History"].firstMatch.tap()
    XCTAssertTrue(app.staticTexts["Study history"].waitForExistence(timeout: 5))
    app.otherElements["Sources"].firstMatch.tap()
    app.otherElements.matching(NSPredicate(format: "label CONTAINS %@", "Settings")).firstMatch.tap()
    reach("Manage storage").tap()
    reach("Manage " + name).tap()
    reach("Delete selected notebook…").tap()
    XCTAssertTrue(app.alerts["Delete notebook?"].waitForExistence(timeout: 5))
    XCTAssertTrue(app.alerts.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", name)).firstMatch.exists)
    app.alerts.buttons["Cancel"].tap()
    XCTAssertTrue(app.buttons["Delete selected notebook…"].exists)
    reach("Delete selected notebook…").tap()
    XCTAssertTrue(app.alerts["Delete notebook?"].waitForExistence(timeout: 5))
    XCTAssertTrue(app.alerts.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", name)).firstMatch.exists)
    app.alerts.buttons["Delete permanently"].tap()
    let removed = NSPredicate(format: "exists == false")
    expectation(for: removed, evaluatedWith: app.buttons["Delete selected notebook…"])
    waitForExpectations(timeout: 10)
  }

  func testLargeTextHomeAccessibility() throws {
    app.launchArguments = ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"]
    app.launch()
    finishSplash()
    XCTAssertTrue(app.buttons["View all notebooks"].waitForExistence(timeout: 20))
    try app.performAccessibilityAudit(for: [.contrast, .sufficientElementDescription, .dynamicType, .textClipped, .hitRegion])
    let screenshot = XCTAttachment(screenshot: app.screenshot())
    screenshot.name = "T7 large-text home"
    screenshot.lifetime = .keepAlways
    add(screenshot)
  }

  func testImportSheetOpensFilesAndAllowsCancelRetry() throws {
    app.launch()
    finishSplash()
    let add = app.buttons["Add your notes →"]
    XCTAssertTrue(add.waitForExistence(timeout: 20))
    add.tap()
    XCTAssertTrue(app.staticTexts["Choose a notebook"].waitForExistence(timeout: 5))
    app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Add notes to ")).firstMatch.tap()
    let file = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Choose a file")).firstMatch
    XCTAssertTrue(file.waitForExistence(timeout: 5))
    file.tap()
    let cancel = app.buttons["Cancel"].firstMatch
    XCTAssertTrue(cancel.waitForExistence(timeout: 10), "System Files picker must be presented")
    expectation(for: NSPredicate(format: "hittable == true"), evaluatedWith: cancel)
    waitForExpectations(timeout: 5)
    cancel.tap()
    let retry = app.buttons["＋  Add your notes"]
    XCTAssertTrue(retry.waitForExistence(timeout: 5))
    expectation(for: NSPredicate(format: "enabled == true"), evaluatedWith: retry)
    waitForExpectations(timeout: 10)
    reach("＋  Add your notes").tap()
    XCTAssertTrue(file.waitForExistence(timeout: 5))
    file.tap()
    XCTAssertTrue(cancel.waitForExistence(timeout: 10))
    cancel.tap()
  }

  func testLocalLogoutAndInstalledTeacherReuse() throws {
    app.launch()
    finishSplash()
    if app.textFields["Nickname"].waitForExistence(timeout: 3) {
      reach("Continue offline").tap()
    }
    if app.staticTexts["Meet your digital teacher"].waitForExistence(timeout: 3) {
      XCTAssertTrue(app.buttons["Continue with my teacher"].waitForExistence(timeout: 60))
      reach("Continue with my teacher").tap()
    }
    XCTAssertTrue(app.buttons["View all notebooks"].waitForExistence(timeout: 20))
    app.otherElements["Settings"].firstMatch.tap()
    reach("Log out").tap()
    app.alerts.buttons["Cancel"].tap()
    XCTAssertTrue(app.buttons["Edit local profile"].exists)
    reach("Log out").tap()
    app.alerts.buttons["Log out"].tap()
    finishSplash()
    XCTAssertTrue(app.textFields["Nickname"].waitForExistence(timeout: 10))
    let nickname = app.textFields["Nickname"].value as? String
    app.terminate()
    app.launch()
    finishSplash()
    XCTAssertTrue(app.textFields["Nickname"].waitForExistence(timeout: 20))
    XCTAssertEqual(app.textFields["Nickname"].value as? String, nickname)
    XCTAssertTrue(app.buttons["Continue offline"].isHittable)
    let welcome = XCTAttachment(screenshot: app.screenshot())
    welcome.name = "Welcome local profile"
    welcome.lifetime = .keepAlways
    add(welcome)
    let language = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Preferred language:")).firstMatch
    XCTAssertTrue(language.isHittable)
    language.tap()
    XCTAssertTrue(app.alerts["Preferred language"].waitForExistence(timeout: 5))
    app.alerts.buttons["Cancel"].tap()
    app.textFields["Nickname"].tap()
    XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5))
    app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.45)).press(forDuration: 0.05, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.2)))
    reach("Continue offline").tap()
    XCTAssertTrue(app.staticTexts["Meet your digital teacher"].waitForExistence(timeout: 10))
    let reuse = app.buttons["Continue with my teacher"]
    XCTAssertTrue(reuse.waitForExistence(timeout: 60))
    let screenshot = XCTAttachment(screenshot: app.screenshot())
    screenshot.name = "Returning teacher setup"
    screenshot.lifetime = .keepAlways
    add(screenshot)
    reach("Continue with my teacher").tap()
    XCTAssertTrue(app.buttons["View all notebooks"].waitForExistence(timeout: 10))
    app.terminate()
    app.launch()
    finishSplash()
    XCTAssertTrue(app.buttons["View all notebooks"].waitForExistence(timeout: 20))
  }

  func testStudyChatViewportAndLocalSummary() throws {
    app.launch()
    finishSplash()
    if app.textFields["Nickname"].waitForExistence(timeout: 3) { reach("Continue offline").tap() }
    if app.staticTexts["Meet your digital teacher"].waitForExistence(timeout: 3) {
      XCTAssertTrue(app.buttons["Continue with my teacher"].waitForExistence(timeout: 60))
      reach("Continue with my teacher").tap()
    }
    XCTAssertTrue(app.buttons["View all notebooks"].waitForExistence(timeout: 20))
    app.buttons["View all notebooks"].tap()
    let notebook = app.buttons.matching(NSPredicate(format: "label == %@", "Open notebook T4 study · synthetic")).firstMatch
    for _ in 0..<15 {
      if notebook.exists && notebook.isHittable { break }
      app.scrollViews.firstMatch.swipeUp()
    }
    guard notebook.exists && notebook.isHittable else { throw XCTSkip("Existing T4 synthetic notebook unavailable; do not change user sources.") }
    notebook.tap()
    app.otherElements["Study"].firstMatch.tap()
    for label in ["Choose study section", "Summarize", "Explain", "Ask", "Quiz", "Give me a hint", "Check my understanding", "Ask my notes"] {
      XCTAssertTrue(app.buttons[label].isHittable, "Viewport action: " + label)
    }
    app.buttons["Choose study section"].tap()
    let section = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Synthetic plant facts · p.")).firstMatch
    XCTAssertTrue(section.waitForExistence(timeout: 5))
    section.tap()
    let completions = app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "summary · complete"))
    let before = completions.count
    app.buttons["Summarize"].tap()
    expectation(for: NSPredicate { _, _ in completions.count > before }, evaluatedWith: app)
    waitForExpectations(timeout: 120)
    let screenshot = XCTAttachment(screenshot: app.screenshot())
    screenshot.name = "Local study chat summary"
    screenshot.lifetime = .keepAlways
    add(screenshot)
    app.buttons["Give me a hint"].tap()
    XCTAssertTrue(app.alerts["A hint from your notes"].waitForExistence(timeout: 5))
    app.alerts.buttons["Cancel"].tap()
    app.buttons["Check my understanding"].tap()
    XCTAssertTrue(app.staticTexts["Practice from your notes"].waitForExistence(timeout: 5))
    reach("← Back to study").tap()
    app.otherElements["History"].firstMatch.tap()
    XCTAssertTrue(app.staticTexts["Study history"].waitForExistence(timeout: 5))
  }

  func testStudyChatKeyboardAskAndCitation() throws {
    app.launch()
    finishSplash()
    XCTAssertTrue(app.buttons["View all notebooks"].waitForExistence(timeout: 20))
    app.buttons["View all notebooks"].tap()
    let notebook = app.buttons.matching(NSPredicate(format: "label == %@", "Open notebook T4 study · synthetic")).firstMatch
    for _ in 0..<15 {
      if notebook.exists && notebook.isHittable { break }
      app.scrollViews.firstMatch.swipeUp()
    }
    guard notebook.exists && notebook.isHittable else { throw XCTSkip("Existing synthetic notebook unavailable.") }
    notebook.tap()
    app.otherElements["Study"].firstMatch.tap()
    let completions = app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "ask · complete"))
    let before = completions.count
    let question = app.textViews.matching(NSPredicate(format: "label BEGINSWITH %@", "Question or topic from your notes")).firstMatch
    XCTAssertTrue(question.waitForExistence(timeout: 5))
    XCTAssertTrue(question.isHittable)
    question.tap()
    question.typeText("What do roots absorb?\n")
    expectation(for: NSPredicate { _, _ in completions.count > before }, evaluatedWith: app)
    waitForExpectations(timeout: 120)
    let citations = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "View source"))
    XCTAssertGreaterThan(citations.count, 0)
    let citation = citations.element(boundBy: citations.count - 1)
    for _ in 0..<5 {
      if citation.isHittable { break }
      app.scrollViews.element(boundBy: 1).swipeUp()
    }
    XCTAssertTrue(citation.isHittable)
    citation.tap()
    XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "Saved revision ")).firstMatch.exists)
    let screenshot = XCTAttachment(screenshot: app.screenshot())
    screenshot.name = "Local chat answer and citation"
    screenshot.lifetime = .keepAlways
    add(screenshot)
  }

  func testStudyChatSavedCitation() throws {
    app.launch()
    finishSplash()
    XCTAssertTrue(app.buttons["View all notebooks"].waitForExistence(timeout: 20))
    app.buttons["View all notebooks"].tap()
    let notebook = app.buttons.matching(NSPredicate(format: "label == %@", "Open notebook T4 study · synthetic")).firstMatch
    for _ in 0..<15 {
      if notebook.exists && notebook.isHittable { break }
      app.scrollViews.firstMatch.swipeUp()
    }
    guard notebook.exists && notebook.isHittable else { throw XCTSkip("Existing synthetic notebook unavailable.") }
    notebook.tap()
    app.otherElements["Study"].firstMatch.tap()
    let citations = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "View source"))
    XCTAssertGreaterThan(citations.count, 0)
    let citation = citations.element(boundBy: citations.count - 1)
    for _ in 0..<10 {
      if citation.isHittable { break }
      let conversation = app.scrollViews.element(boundBy: 1)
      let target = citation.frame.midY < conversation.frame.minY ? 0.75 : 0.25
      conversation.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).press(forDuration: 0.05, thenDragTo: conversation.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: target)))
    }
    XCTAssertTrue(citation.isHittable)
    citation.tap()
    XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "Saved revision ")).firstMatch.exists)
    let screenshot = XCTAttachment(screenshot: app.screenshot())
    screenshot.name = "Saved local summary citation"
    screenshot.lifetime = .keepAlways
    add(screenshot)
  }

  func testBuddyIntroductionToChat() throws {
    app.launch()
    finishSplash()
    XCTAssertTrue(app.otherElements["AI Buddy"].firstMatch.waitForExistence(timeout: 20))
    app.otherElements["AI Buddy"].firstMatch.tap()
    let start = app.buttons["buddy-get-started"]
    XCTAssertTrue(start.waitForExistence(timeout: 5))
    XCTAssertTrue(start.isHittable)
    XCTAssertFalse(app.buttons["AI Buddy chat history"].exists)
    let welcome = XCTAttachment(screenshot: app.screenshot())
    welcome.name = "Buddy introduction reference 16"
    welcome.lifetime = .keepAlways
    add(welcome)
    start.tap()
    XCTAssertTrue(app.buttons["AI Buddy chat history"].waitForExistence(timeout: 5))
    XCTAssertTrue(app.buttons["Explore"].isHittable)
    XCTAssertTrue(app.textViews.matching(NSPredicate(format: "label BEGINSWITH %@", "Message AI Buddy")).firstMatch.isHittable)
    app.buttons["AI Buddy chat history"].tap()
    XCTAssertTrue(app.buttons["Close chat history"].waitForExistence(timeout: 5))
    app.buttons["Close chat history"].tap()
    let chat = XCTAttachment(screenshot: app.screenshot())
    chat.name = "Existing Buddy chat after Get Started"
    chat.lifetime = .keepAlways
    add(chat)
    app.otherElements["Home"].firstMatch.tap()
    app.otherElements["AI Buddy"].firstMatch.tap()
    XCTAssertTrue(start.waitForExistence(timeout: 5))
  }

  func testBuddyLocalConversationAndHistory() throws {
    app.launch()
    finishSplash()
    if app.textFields["Nickname"].waitForExistence(timeout: 3) { reach("Continue offline").tap() }
    if app.staticTexts["Meet your digital teacher"].waitForExistence(timeout: 3) {
      XCTAssertTrue(app.buttons["Continue with my teacher"].waitForExistence(timeout: 60))
      reach("Continue with my teacher").tap()
    }
    app.otherElements["AI Buddy"].firstMatch.tap()
    app.buttons["buddy-get-started"].tap()
    for label in ["AI Buddy chat history", "New AI Buddy chat", "Review practice", "Practice", "Explore", "Send to AI Buddy"] {
      XCTAssertTrue(app.buttons[label].isHittable, label)
    }
    let welcome = XCTAttachment(screenshot: app.screenshot())
    welcome.name = "AI Buddy welcome"
    welcome.lifetime = .keepAlways
    add(welcome)
    let question = app.textViews.matching(NSPredicate(format: "label BEGINSWITH %@", "Message AI Buddy")).firstMatch
    let first = "For this test, my favorite planet is Mars. Remember it."
    question.tap()
    question.typeText(first + "\n")
    let complete = app.staticTexts.matching(NSPredicate(format: "identifier BEGINSWITH %@ AND label CONTAINS %@", "buddy-status-", "complete"))
    expectation(for: NSPredicate { _, _ in complete.count == 1 }, evaluatedWith: app)
    waitForExpectations(timeout: 90)
    question.tap()
    question.typeText("Which planet did I mention?\n")
    expectation(for: NSPredicate { _, _ in complete.count == 2 }, evaluatedWith: app)
    waitForExpectations(timeout: 90)
    let answers = app.staticTexts.matching(NSPredicate(format: "identifier BEGINSWITH %@", "buddy-answer-"))
    XCTAssertTrue(answers.firstMatch.label.lowercased().contains("mars"))
    let conversation = XCTAttachment(screenshot: app.screenshot())
    conversation.name = "AI Buddy real local follow-up"
    conversation.lifetime = .keepAlways
    add(conversation)
    app.buttons["New AI Buddy chat"].tap()
    XCTAssertTrue(app.staticTexts["Hello! What can I help you learn?"].waitForExistence(timeout: 5))
    app.terminate()
    app.launch()
    finishSplash()
    app.otherElements["AI Buddy"].firstMatch.tap()
    app.buttons["buddy-get-started"].tap()
    app.buttons["AI Buddy chat history"].tap()
    let saved = app.buttons["Open chat " + first].firstMatch
    XCTAssertTrue(saved.waitForExistence(timeout: 5))
    app.buttons["Delete chat " + first].firstMatch.tap()
    app.alerts.buttons["Cancel"].tap()
    saved.tap()
    XCTAssertEqual(complete.count, 2)
    XCTAssertTrue(answers.firstMatch.label.lowercased().contains("mars"))
  }

  func testProfileAvatarSelectionAndPersistence() throws {
    app.launch()
    finishSplash()
    if app.textFields["Nickname"].waitForExistence(timeout: 3) { reach("Continue offline").tap() }
    if app.staticTexts["Meet your digital teacher"].waitForExistence(timeout: 3) { reach("Continue with my teacher").tap() }
    XCTAssertTrue(app.buttons["View all notebooks"].waitForExistence(timeout: 20))
    app.otherElements["Settings"].firstMatch.tap()
    reach("Log out").tap()
    app.alerts.buttons["Log out"].tap()
    finishSplash()
    XCTAssertTrue(app.textFields["Nickname"].waitForExistence(timeout: 10))
    let nickname = app.textFields["Nickname"].value as? String
    let boy = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Boy avatar")).firstMatch
    let girl = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Girl avatar")).firstMatch
    XCTAssertTrue(boy.isHittable)
    XCTAssertTrue(girl.isHittable)
    boy.tap()
    XCTAssertTrue(app.descendants(matching: .any)["profile-avatar-boy-selected"].exists)
    girl.tap()
    XCTAssertTrue(app.descendants(matching: .any)["profile-avatar-girl-selected"].exists)
    let welcome = XCTAttachment(screenshot: app.screenshot())
    welcome.name = "Selected girl avatar on welcome"
    welcome.lifetime = .keepAlways
    add(welcome)
    app.textFields["Nickname"].tap()
    XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5))
    app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.45)).press(forDuration: 0.05, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.2)))
    reach("Continue offline").tap()
    XCTAssertTrue(app.buttons["Continue with my teacher"].waitForExistence(timeout: 60))
    reach("Continue with my teacher").tap()
    app.otherElements["Settings"].firstMatch.tap()
    reach("Edit local profile").tap()
    XCTAssertTrue(app.descendants(matching: .any)["profile-avatar-girl-selected"].exists)
    XCTAssertEqual(app.textFields["Nickname"].value as? String, nickname)
    boy.tap()
    reach("Save profile").tap()
    XCTAssertTrue(app.staticTexts["Saved on this device."].waitForExistence(timeout: 5))
    app.terminate()
    app.launch()
    finishSplash()
    XCTAssertTrue(app.buttons["View all notebooks"].waitForExistence(timeout: 20))
    app.otherElements["Settings"].firstMatch.tap()
    let settings = XCTAttachment(screenshot: app.screenshot())
    settings.name = "Saved boy avatar in Settings after relaunch"
    settings.lifetime = .keepAlways
    add(settings)
    reach("Log out").tap()
    app.alerts.buttons["Log out"].tap()
    finishSplash()
    XCTAssertTrue(app.descendants(matching: .any)["profile-avatar-boy-selected"].waitForExistence(timeout: 10))
    XCTAssertEqual(app.textFields["Nickname"].value as? String, nickname)
    reach("Continue offline").tap()
    XCTAssertTrue(app.buttons["Continue with my teacher"].waitForExistence(timeout: 60))
    reach("Continue with my teacher").tap()
  }

  func testBottomTabsShowSelectedState() throws {
    app.launch()
    finishSplash()
    XCTAssertTrue(app.buttons["View all notebooks"].waitForExistence(timeout: 20))
    for label in ["Home", "Progress", "Settings", "Home"] {
      let tab = app.otherElements[label].firstMatch
      XCTAssertTrue(tab.isHittable)
      tab.tap()
      XCTAssertTrue(tab.isSelected)
      for other in ["Home", "Progress", "Settings"] where other != label {
        XCTAssertFalse(app.otherElements[other].firstMatch.isSelected)
      }
      let screenshot = XCTAttachment(screenshot: app.screenshot())
      screenshot.name = "Selected tab " + label
      screenshot.lifetime = .keepAlways
      add(screenshot)
    }
  }

  func testSettingsOverviewAndSafeNavigation() throws {
    app.launch()
    finishSplash()
    XCTAssertTrue(app.buttons["View all notebooks"].waitForExistence(timeout: 20))
    app.otherElements.matching(NSPredicate(format: "label CONTAINS %@", "Settings")).firstMatch.tap()
    XCTAssertTrue(app.buttons["Edit local profile"].waitForExistence(timeout: 5))
    for label in ["Edit local profile", "Manage model", "Manage storage", "Privacy and limitations", "Delete study data"] {
      XCTAssertTrue(app.buttons[label].isHittable, label + " must fit the phone")
    }
    let screenshot = XCTAttachment(screenshot: app.screenshot())
    screenshot.name = "Settings overview"
    screenshot.lifetime = .keepAlways
    add(screenshot)
    app.buttons["Edit local profile"].tap()
    XCTAssertTrue(app.textFields["Nickname"].waitForExistence(timeout: 5))
    app.buttons["← Back to settings"].tap()
    app.buttons["Manage model"].tap()
    XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "Teacher · ")).firstMatch.waitForExistence(timeout: 5))
    app.buttons["← Back to settings"].tap()
    for label in ["Manage storage", "Delete study data"] {
      app.buttons[label].tap()
      XCTAssertTrue(app.staticTexts["Storage · on this device"].waitForExistence(timeout: 5))
      XCTAssertEqual(app.alerts.count, 0)
      app.buttons["← Back to settings"].tap()
    }
    app.buttons["Privacy and limitations"].tap()
    XCTAssertTrue(app.staticTexts["Private by design"].waitForExistence(timeout: 5))
    app.buttons["← Back to settings"].tap()
  }

  func testProgressResultOverviewAndHistory() throws {
    app.launch()
    finishSplash()
    XCTAssertTrue(app.buttons["View all notebooks"].waitForExistence(timeout: 20))
    app.otherElements.matching(NSPredicate(format: "label CONTAINS %@", "Progress")).firstMatch.tap()
    XCTAssertTrue(app.staticTexts["Practice complete"].waitForExistence(timeout: 10))
    XCTAssertTrue(app.staticTexts["Based on 1 attempt · Not a mastery score."].exists)
    let screenshot = XCTAttachment(screenshot: app.screenshot())
    screenshot.name = "Progress latest real result"
    screenshot.lifetime = .keepAlways
    add(screenshot)
    if app.buttons["Review this topic"].exists {
      reach("Review this topic").tap()
      XCTAssertTrue(app.buttons["← Back to progress"].waitForExistence(timeout: 5))
      reach("← Back to progress").tap()
    }
    reach("View all progress & history").tap()
    XCTAssertTrue(app.buttons["← Back to latest result"].waitForExistence(timeout: 5))
    app.buttons["← Back to latest result"].tap()
    XCTAssertTrue(app.staticTexts["Practice complete"].waitForExistence(timeout: 5))
  }

  func testHomeImportRequiresDestination() throws {
    app.launch()
    finishSplash()
    XCTAssertTrue(app.buttons["Paste text"].waitForExistence(timeout: 20))
    for label in ["Add your notes →", "Open add notes options", "Choose a file", "Use camera", "Paste text"] {
      app.buttons[label].tap()
      XCTAssertTrue(app.staticTexts["Choose a notebook"].waitForExistence(timeout: 5))
      XCTAssertFalse(app.textViews.matching(NSPredicate(format: "label BEGINSWITH %@", "Paste source text")).firstMatch.exists)
      app.buttons["Close import options"].tap()
    }
    app.buttons["Paste text"].tap()
    let destinations = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Add notes to "))
    XCTAssertTrue(destinations.firstMatch.waitForExistence(timeout: 5))
    let destination = destinations.element(boundBy: min(1, destinations.count - 1))
    let title = String(destination.label.dropFirst("Add notes to ".count))
    destination.tap()
    XCTAssertTrue(app.textViews.matching(NSPredicate(format: "label BEGINSWITH %@", "Paste source text")).firstMatch.waitForExistence(timeout: 5))
    XCTAssertTrue(app.staticTexts["Adding to: " + title].exists)
    app.buttons["Close import options"].tap()
    app.buttons["Back to notebooks"].tap()
    app.buttons["Paste text"].tap()
    XCTAssertTrue(app.staticTexts["Choose a notebook"].waitForExistence(timeout: 5))
    app.buttons["Close import options"].tap()
  }

  func testHomeReadyActionsFitWithoutVerticalScrolling() throws {
    app.launch()
    finishSplash()
    XCTAssertTrue(app.buttons["View all notebooks"].waitForExistence(timeout: 20))
    for label in ["Create notebook", "View all notebooks", "Scroll notebooks left", "Scroll notebooks right", "Add your notes →", "Choose a file", "Use camera", "Paste text"] {
      XCTAssertTrue(app.buttons[label].isHittable, "Home action must fit the viewport: " + label)
    }
    let right = app.buttons["Scroll notebooks right"]
    if right.isEnabled {
      right.tap()
      let left = app.buttons["Scroll notebooks left"]
      expectation(for: NSPredicate(format: "enabled == true"), evaluatedWith: left)
      waitForExpectations(timeout: 5)
      left.tap()
    }
    let screenshot = XCTAttachment(screenshot: app.screenshot())
    screenshot.name = "Compact home ready state"
    screenshot.lifetime = .keepAlways
    add(screenshot)
    app.buttons["View all notebooks"].tap()
    XCTAssertTrue(app.staticTexts["All notebooks"].waitForExistence(timeout: 5))
    app.buttons["Create notebook"].tap()
    XCTAssertTrue(app.textFields["Notebook name"].waitForExistence(timeout: 5))
    app.buttons["Close import options"].tap()
    let notebook = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Open notebook ")).firstMatch
    XCTAssertTrue(notebook.waitForExistence(timeout: 5))
    notebook.tap()
    XCTAssertTrue(app.otherElements["Sources"].firstMatch.waitForExistence(timeout: 5))
    app.buttons["Back to notebooks"].tap()
    XCTAssertTrue(app.staticTexts["All notebooks"].waitForExistence(timeout: 5))
    app.buttons["Back to home"].tap()
    XCTAssertTrue(app.buttons["View all notebooks"].waitForExistence(timeout: 5))
  }
}
