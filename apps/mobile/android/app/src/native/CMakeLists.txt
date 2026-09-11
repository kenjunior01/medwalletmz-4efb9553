cmake_minimum_required(VERSION 3.6)
# Placeholder nativo NEUTRO — impede o CMake sintético do Flutter (que
# exigiria NDK real só para strip). Sem linguagens/toolchain: os .so dos
# plugins vêm pré-compilados dos AARs e o strip fica desligado.
unset(CMAKE_TOOLCHAIN_FILE CACHE)
set(CMAKE_SYSTEM_NAME Linux)
set(CMAKE_SYSTEM_PROCESSOR x86_64)
project(medwallet_native_placeholder LANGUAGES C)
add_library(medwallet_placeholder STATIC placeholder.c)
set_target_properties(medwallet_placeholder PROPERTIES LINKER_LANGUAGE C)
