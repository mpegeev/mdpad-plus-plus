// Скрываем дополнительное консольное окно на Windows в release-режиме.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    mdpad_plus_plus_lib::run()
}
