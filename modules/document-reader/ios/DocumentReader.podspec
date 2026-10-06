Pod::Spec.new do |spec|
  spec.name = 'DocumentReader'
  spec.version = '0.0.1'
  spec.summary = 'Gurukul local T0 document reader'
  spec.description = 'Bounded local model verification and printed English OCR.'
  spec.homepage = 'https://example.invalid/gurukul'
  spec.license = { :type => 'Proprietary' }
  spec.author = 'Gurukul'
  spec.source = { :path => '.' }
  spec.platform = :ios, '16.4'
  spec.swift_version = '5.9'
  spec.static_framework = true
  spec.dependency 'ExpoModulesCore'
  spec.frameworks = 'Vision', 'PDFKit', 'CryptoKit', 'ImageIO'
  spec.source_files = '**/*.swift'
end
