#[no_mangle]
pub unsafe extern "C" fn execve(
    _prog: *const libc::c_char,
    _argv: *const *const libc::c_char,
    _envp: *const *const libc::c_char,
) -> libc::c_int {
    return 0;
}
