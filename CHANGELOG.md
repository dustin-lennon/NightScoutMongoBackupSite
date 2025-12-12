## [1.0.1](https://github.com/dustin-lennon/NightScoutMongoBackupSite/compare/v1.0.0...v1.0.1) (2025-12-12)


### Bug Fixes

* inject version at build time for Next.js ([52bbe38](https://github.com/dustin-lennon/NightScoutMongoBackupSite/commit/52bbe38126401bd69d5014aa5cd09cdf787d0d7c))

# 1.0.0 (2025-12-12)


### Bug Fixes

* allow semantic-release to bypass branch protection ([77b6e65](https://github.com/dustin-lennon/NightScoutMongoBackupSite/commit/77b6e6534c6d476dcfb9d3af83b861d9a3d0a74c))
* configure git remote to use PAT token for semantic-release ([bc703e7](https://github.com/dustin-lennon/NightScoutMongoBackupSite/commit/bc703e720afc9fc37971755886f2e3ff9de33cac))
* ensure checkout step uses RELEASE_TOKEN consistently ([f9a8f48](https://github.com/dustin-lennon/NightScoutMongoBackupSite/commit/f9a8f4895e33950491e2b49e6258d56af377cc1b))
* ensure deploy workflow triggers on push to main ([6cad2bc](https://github.com/dustin-lennon/NightScoutMongoBackupSite/commit/6cad2bc515e97ea648669d9f52c42acc5c2143c9))
* skip commitlint validation for semantic-release commits ([0da9c37](https://github.com/dustin-lennon/NightScoutMongoBackupSite/commit/0da9c37df731ecdb8457d214b68c27d71b7965a6))
* update checkout step to use RELEASE_TOKEN ([1b1ffa8](https://github.com/dustin-lennon/NightScoutMongoBackupSite/commit/1b1ffa83401253ae5e189ab6f5824fbf1c8b674d))
* use RELEASE_TOKEN as primary PAT secret name ([4d445a5](https://github.com/dustin-lennon/NightScoutMongoBackupSite/commit/4d445a556f68a859e0eee648a1e4ab483aad1f64))


### Features

* setup automated semantic versioning with semantic-release ([3daf70b](https://github.com/dustin-lennon/NightScoutMongoBackupSite/commit/3daf70b030d752188a872bfe84733208a89a1bc8))


### BREAKING CHANGES

* Version management is now automated via semantic-release
