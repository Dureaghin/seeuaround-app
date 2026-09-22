Pod::Spec.new do |s|
  s.name           = 'declared-age-range'
  s.version        = '1.0.0'
  s.summary        = 'Asks iOS for a declared age range'
  s.homepage       = 'https://seeuaround.com'
  s.license        = 'MIT'
  s.author         = 'See U Around'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.{h,m,mm,swift}'
  s.weak_frameworks = 'DeclaredAgeRange'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
