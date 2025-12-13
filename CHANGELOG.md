# [1.5.0](https://github.com/Stelth2000-Inc/NightScoutMongoBackupSite/compare/v1.4.0...v1.5.0) (2025-12-13)


### Features

* add Codecov coverage upload to TypeScript testing workflow ([f2c7116](https://github.com/Stelth2000-Inc/NightScoutMongoBackupSite/commit/f2c7116ef434b8c8b3b2da06477ec0505bbe2982))

# [1.4.0](https://github.com/Stelth2000-Inc/NightScoutMongoBackupSite/compare/v1.3.1...v1.4.0) (2025-12-13)


### Bug Fixes

* add error handling for missing project in automation workflows ([367ad7c](https://github.com/Stelth2000-Inc/NightScoutMongoBackupSite/commit/367ad7c4a7a7f058164d343cac09bacb5627fe92))
* move PR template to correct location per GitHub convention ([6f5b1bc](https://github.com/Stelth2000-Inc/NightScoutMongoBackupSite/commit/6f5b1bce075b6f6e29cd8165cdc61c8311a9ab14))
* remove invalid GitHub Actions expression syntax for PROJECT_NUMBER default ([9d8c508](https://github.com/Stelth2000-Inc/NightScoutMongoBackupSite/commit/9d8c5085c9603acc6cf069e933341cc308a59bcb))


### Features

* add SonarQube issues sync workflow ([9910d54](https://github.com/Stelth2000-Inc/NightScoutMongoBackupSite/commit/9910d54e9530e9441e4ed952d369089b6b05e6c6))
* sync project-automation workflow with NightScoutMongoBackup ([9f7c2da](https://github.com/Stelth2000-Inc/NightScoutMongoBackupSite/commit/9f7c2da8773950249311f7d11d91050fe4ef5524))

## [1.3.1](https://github.com/dustin-lennon/NightScoutMongoBackupSite/compare/v1.3.0...v1.3.1) (2025-12-12)


### Bug Fixes

* update delete button test to properly mock fetch for delete API ([593087e](https://github.com/dustin-lennon/NightScoutMongoBackupSite/commit/593087e59f3716b87905d4eb39da0b8154d8ec3d))

# [1.3.0](https://github.com/dustin-lennon/NightScoutMongoBackupSite/compare/v1.2.0...v1.3.0) (2025-12-12)


### Bug Fixes

* skip additional PM2 status component tests with timing issues ([96752a5](https://github.com/dustin-lennon/NightScoutMongoBackupSite/commit/96752a5093e2d7bc69949143097799bda6573dfd))
* update tests for PM2 status feature ([e75b49a](https://github.com/dustin-lennon/NightScoutMongoBackupSite/commit/e75b49a74b1c840b493f3619b8acad6039d4b19d))


### Features

* add PM2 status display for Discord bot ([b7907cb](https://github.com/dustin-lennon/NightScoutMongoBackupSite/commit/b7907cb0fe2e9c57d8717a1e13cf64e8f0487a80))

# [1.2.0](https://github.com/dustin-lennon/NightScoutMongoBackupSite/compare/v1.1.0...v1.2.0) (2025-12-12)


### Bug Fixes

* explicitly specify node interpreter for PM2 ([4d3fde2](https://github.com/dustin-lennon/NightScoutMongoBackupSite/commit/4d3fde2576596f2852c5ac0b8dd45813c9faba95))


### Features

* use start.js script to launch application with version display ([864df0b](https://github.com/dustin-lennon/NightScoutMongoBackupSite/commit/864df0ba0bf344138215f7bd33a1a1c71227707f))

# [1.1.0](https://github.com/dustin-lennon/NightScoutMongoBackupSite/compare/v1.0.1...v1.1.0) (2025-12-12)


### Features

* enable PM2 version metadata ([f4cf71a](https://github.com/dustin-lennon/NightScoutMongoBackupSite/commit/f4cf71ac1b4eeb4a36facfa6a01278715882c845))

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
