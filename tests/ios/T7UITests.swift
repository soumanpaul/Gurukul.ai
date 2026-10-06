import XCTest

@MainActor
final class T7UITests: XCTestCase {
  let app = XCUIApplication(bundleIdentifier: "org.gurukul.t0")

  override func setUpWithError() throws {
    continueAfterFailure = false
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
    XCTAssertTrue(app.buttons["View all notebooks"].waitForExistence(timeout: 20))
    try app.performAccessibilityAudit(for: [.contrast, .sufficientElementDescription, .dynamicType, .textClipped, .hitRegion])
    let screenshot = XCTAttachment(screenshot: app.screenshot())
    screenshot.name = "T7 large-text home"
    screenshot.lifetime = .keepAlways
    add(screenshot)
  }

  func testImportSheetOpensFilesAndAllowsCancelRetry() throws {
    app.launch()
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

  func testBottomTabsShowSelectedState() throws {
    app.launch()
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
