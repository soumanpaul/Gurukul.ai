import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const changes = [
  ['llama-rn.podspec', 'require "json"', 'require "json"\nENV["RNLLAMA_BUILD_FROM_SOURCE"] = "1"'],
  ['android/build.gradle', 'def isRNLlamaBuildFromSource = (project.findProperty("rnllamaBuildFromSource") ?: "false").toString() == "true"', 'def isRNLlamaBuildFromSource = true'],
  ['android/src/main/rnllama/CMakeLists.txt', 'function(build_rnllama_library target_name arch cpu_flags)', 'function(build_rnllama_library target_name arch cpu_flags)\n    if ("${target_name}" MATCHES "_hexagon|_opencl")\n        return()\n    endif()'],
  ['android/src/main/CMakeLists.txt', 'function(build_rnllama_jni jni_name rnllama_name arch cpu_flags)', 'function(build_rnllama_jni jni_name rnllama_name arch cpu_flags)\n    if ("${rnllama_name}" MATCHES "_hexagon|_opencl")\n        return()\n    endif()'],
  ['android/src/main/jni.cpp', '#define LOGI(...) __android_log_print(ANDROID_LOG_INFO,     TAG, __VA_ARGS__)', '#define LOGI(...) ((void)0)'],
  ['android/src/main/jni.cpp', '#define LOGW(...) __android_log_print(ANDROID_LOG_WARN,     TAG, __VA_ARGS__)', '#define LOGW(...) ((void)0)'],
  ['android/src/main/jni.cpp', '#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR,    TAG, __VA_ARGS__)', '#define LOGE(...) ((void)0)'],
  ['android/src/main/java/com/rnllama/RNLlama.java', 'Log.e(NAME, "Failed to wait for task", e);', 'Log.e(NAME, "Local task failed");'],
  ['cpp/rn-llama.cpp', 'const char *format, ...)\n{', 'const char *format, ...)\n{\n    return;'],
  ['cpp/llama-impl.cpp', 'void llama_log_callback_default(lm_ggml_log_level level, const char * text, void * user_data) {', 'void llama_log_callback_default(lm_ggml_log_level level, const char * text, void * user_data) {\n    return;'],
  ['cpp/ggml.c', 'void lm_ggml_log_callback_default(enum lm_ggml_log_level level, const char * text, void * user_data) {', 'void lm_ggml_log_callback_default(enum lm_ggml_log_level level, const char * text, void * user_data) {\n    return;'],
  ['cpp/common/log.cpp', 'void common_log_add(struct common_log * log, enum lm_ggml_log_level level, const char * fmt, ...) {', 'void common_log_add(struct common_log * log, enum lm_ggml_log_level level, const char * fmt, ...) {\n    return;'],
  ['ios/RNLlamaContext.mm', '#import <Metal/Metal.h>', '#import <Metal/Metal.h>\n#define NSLog(...) ((void)0)'],
  ['ios/RNLlamaContext.mm', '+ (void)toggleNativeLog:(BOOL)enabled onEmitLog:(void (^)(NSString *level, NSString *text))onEmitLog {', '+ (void)toggleNativeLog:(BOOL)enabled onEmitLog:(void (^)(NSString *level, NSString *text))onEmitLog {\n    return;'],
  ['android/src/main/jni.cpp', 'static void rnllama_log_callback_default(lm_ggml_log_level level, const char * fmt, void * data) {', 'static void rnllama_log_callback_default(lm_ggml_log_level level, const char * fmt, void * data) {\n    return;'],
  ['android/src/main/jni.cpp', 'static void rnllama_log_callback_to_j(lm_ggml_log_level level, const char * text, void * data) {', 'static void rnllama_log_callback_to_j(lm_ggml_log_level level, const char * text, void * data) {\n    return;'],
];

export function patchText(source, original, replacement) {
  if (source.includes(replacement)) return source;
  if (source.split(original).length !== 2) throw new Error('Unexpected llama.rn source; refuse an unverified privacy patch');
  return source.replace(original, replacement);
}

export function prepare(root, check = false) {
  const directory = resolve(root, 'node_modules/llama.rn');
  if (JSON.parse(readFileSync(resolve(directory, 'package.json'), 'utf8')).version !== '0.9.1') throw new Error('Privacy patch supports llama.rn 0.9.1 only');
  const files = new Map();
  for (const [file, original, replacement] of changes) {
    const path = resolve(directory, file);
    const source = files.get(path) ?? readFileSync(path, 'utf8');
    files.set(path, patchText(source, original, replacement));
  }
  for (const [path, result] of files) {
    if (readFileSync(path, 'utf8') === result) continue;
    if (check) throw new Error('Run npm run native:privacy before building');
    writeFileSync(path, result);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  prepare(resolve(fileURLToPath(new URL('..', import.meta.url))), process.argv.includes('--check'));
  console.log('Gurukul llama.rn privacy patch verified; iOS source build required.');
}
