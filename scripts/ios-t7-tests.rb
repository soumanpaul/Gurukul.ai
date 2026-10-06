require 'xcodeproj'

root = File.expand_path('..', __dir__)
project_path = File.join(root, 'ios/GurukulT0.xcodeproj')
project = Xcodeproj::Project.open(project_path)
application = project.targets.find { |target| target.name == 'GurukulT0' }
raise 'Expected Gurukul app target' unless application
name = 'GurukulT7UITests'
target = project.targets.find { |item| item.name == name }
unless target
  target = project.new_target(:ui_test_bundle, name, :ios, '17.0')
  group = project.main_group.new_group(name, '../tests/ios')
  target.add_file_references([group.new_file('T7UITests.swift')])
  target.add_dependency(application)
end
target.build_configurations.each do |configuration|
  configuration.build_settings.merge!({
    'PRODUCT_BUNDLE_IDENTIFIER' => 'org.gurukul.t0.t7uitests',
    'PRODUCT_NAME' => '$(TARGET_NAME)',
    'DEVELOPMENT_TEAM' => application.build_configurations.first.build_settings['DEVELOPMENT_TEAM'],
    'CODE_SIGN_STYLE' => 'Automatic',
    'GENERATE_INFOPLIST_FILE' => 'YES',
    'SWIFT_VERSION' => '5.0',
    'TEST_TARGET_NAME' => 'GurukulT0',
    'TARGETED_DEVICE_FAMILY' => '1',
  })
end
project.save
scheme_path = File.join(project_path, 'xcshareddata/xcschemes/GurukulT0.xcscheme')
scheme = Xcodeproj::XCScheme.new(scheme_path)
unless scheme.test_action.testables.any? { |item| item.buildable_references.any? { |reference| reference.target_uuid == target.uuid } }
  scheme.test_action.add_testable(Xcodeproj::XCScheme::TestAction::TestableReference.new(target))
end
scheme.save_as(project_path, 'GurukulT0', true)
puts 'Configured project-local T7 UI tests; no global settings changed.'
