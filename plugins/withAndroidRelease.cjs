const { withAppBuildGradle } = require('expo/config-plugins');

module.exports = function withAndroidRelease(config) {
  return withAppBuildGradle(config, (result) => {
    let source = result.modResults.contents;
    const header = `
// The upload key stays local and outside source control.
def darewazaSigningPath = new File(rootProject.projectDir, '../credentials/android-signing.json')
def darewazaSigning = darewazaSigningPath.exists() ? new groovy.json.JsonSlurper().parse(darewazaSigningPath) : null
`;
    source = header + source;
    source = source.replace('    defaultConfig {', '    defaultConfig {\n        externalNativeBuild { cmake { arguments "-DCMAKE_OBJECT_PATH_MAX=240" } }');
    source = source.replace('signingConfigs {', `signingConfigs {
        release {
            if (darewazaSigning != null) {
                storeFile new File(rootProject.projectDir, '../credentials/darewaza-upload.jks')
                storePassword darewazaSigning.storePassword
                keyAlias darewazaSigning.keyAlias
                keyPassword darewazaSigning.keyPassword
            }
        }`);
    const buildTypesAt = source.indexOf('    buildTypes {');
    source = source.slice(0, buildTypesAt) + source.slice(buildTypesAt).replace(/(release\s*\{[\s\S]*?)signingConfig signingConfigs.debug/, '$1signingConfig signingConfigs.release');
    source += `
gradle.taskGraph.whenReady { graph ->
    if (graph.allTasks.any { it.name.toLowerCase().contains('release') } && darewazaSigning == null) {
        throw new GradleException('Missing credentials/android-signing.json. Run npm run build:android first.')
    }
}
`;
    result.modResults.contents = source;
    return result;
  });
};
