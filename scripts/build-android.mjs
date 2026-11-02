import { existsSync } from 'node:fs';
import { mkdir,readFile,writeFile,copyFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const env={...process.env,NODE_ENV:'production',EXPO_NO_DOTENV:'1'};
const {parse}=await import('dotenv');
const local=existsSync(path.join(root,'.env'))?parse(await readFile(path.join(root,'.env'))):{};
// Native bundles receive public configuration only; backend secrets are unnecessary here.
for(const [key,value] of Object.entries(local))if(key.startsWith('EXPO_PUBLIC_'))env[key]=value;
env.JAVA_HOME=process.env.DAREWAZA_JAVA_HOME||'D:/androidstudio/jbr';
env.ANDROID_HOME=process.env.ANDROID_HOME||`${process.env.LOCALAPPDATA}/Android/Sdk`;
const inheritedPath=process.env.PATH||process.env.Path||'';
for(const key of Object.keys(env))if(key.toLowerCase()==='path')delete env[key];
env.PATH=`${env.JAVA_HOME}/bin;${path.dirname(process.execPath)};${inheritedPath}`;
function run(executable,args,cwd=root,extra={}) {
 return new Promise((resolve,reject)=>{const child=spawn(executable,args,{cwd,env:{...env,...extra},stdio:'inherit',shell:false,windowsHide:true});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(`${path.basename(executable)} exited ${code}`)));});
}
await mkdir(path.join(root,'credentials'),{recursive:true});
const signingFile=path.join(root,'credentials/android-signing.json');
if(!existsSync(signingFile)) {
 if(existsSync(path.join(root,'credentials/darewaza-upload.jks')))throw new Error('An upload key exists without its signing configuration. Recover the configuration instead of overwriting the key.');
 const password=randomBytes(32).toString('base64url');
 const signing={keyAlias:'darewaza-upload',storePassword:password,keyPassword:password};
 await run(path.join(env.JAVA_HOME,'bin/keytool.exe'),['-genkeypair','-v','-storetype','JKS','-keystore','credentials/darewaza-upload.jks','-storepass:env','DAREWAZA_KEYSTORE_PASSWORD','-keypass:env','DAREWAZA_KEYSTORE_PASSWORD','-alias',signing.keyAlias,'-keyalg','RSA','-keysize','4096','-validity','10000','-dname','CN=Darewaza, OU=Mobile, O=TRX Studio'],root,{DAREWAZA_KEYSTORE_PASSWORD:password});
 await writeFile(signingFile,JSON.stringify(signing,null,2));
 console.log('Created the local upload key. Keep credentials/ backed up privately.');
}
if(!process.argv.includes('--skip-prebuild'))await run(process.execPath,['node_modules/expo/bin/cli','prebuild','--platform','android','--no-install']);
await writeFile(path.join(root,'android/local.properties'),`sdk.dir=${env.ANDROID_HOME.replace(/\\/g,'/') }\n`);
const {platform}=process;
if(platform!=='win32')throw new Error('This local build script currently targets the configured Windows workspace.');
await run(process.env.ComSpec||'C:/Windows/System32/cmd.exe',['/d','/c','gradlew.bat','bundleRelease','assembleRelease','--no-daemon','--max-workers=3','-PreactNativeArchitectures=arm64-v8a,x86_64','-Dorg.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m'],path.join(root,'android'));
await mkdir(path.join(root,'artifacts/google-play'),{recursive:true});
await copyFile(path.join(root,'android/app/build/outputs/bundle/release/app-release.aab'),path.join(root,'artifacts/google-play/darewaza-1.0.0.aab'));
await copyFile(path.join(root,'android/app/build/outputs/apk/release/app-release.apk'),path.join(root,'artifacts/google-play/darewaza-1.0.0.apk'));
console.log('Signed Android App Bundle and APK are in artifacts/google-play/.');
