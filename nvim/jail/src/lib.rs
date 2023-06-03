use std::ffi::CString;
use std::ffi::{c_char, c_int, c_void};
use std::mem::transmute;
use std::mem::ManuallyDrop;

const RTLD_NEXT: *mut c_void = -1i64 as *mut c_void;
extern "C" {
    fn dlsym(handle: *mut c_void, symbol: *const c_char) -> *mut c_void;
}

#[no_mangle]
pub unsafe extern "C" fn open(path: *const c_char, oflag: c_int) -> c_int {
    let original_open = dlsym(RTLD_NEXT, "open\0".as_ptr() as _);
    #[allow(unused_variables)]
    let original_open: extern "C" fn(*const c_char, c_int) -> c_int = transmute(original_open);

    let cpath = ManuallyDrop::new(CString::from_raw(path as _));
    if parse_open_flags(oflag) == -1 {
        eprintln!("denied write to: {:?}\n", &cpath);
        return -1;
    };

    original_open(path, oflag)
}

fn parse_open_flags(flags: i32) -> i32 {
    const O_RDONLY: i32 = 0x0000;
    const O_WRONLY: i32 = 0x0001;
    const O_RDWR: i32 = 0x0002;
    const O_CREAT: i32 = 0x0040;
    const O_TRUNC: i32 = 0x0200;

    if flags & O_RDONLY != 0 {
        // Read operation
        // std.debug.print("Read operation\n", .{});
        return 0;
    } else if flags & O_WRONLY != 0 {
        // Write operation
        // std.debug.print("Write operation\n", .{});
        return -1;
    } else if flags & O_RDWR != 0 {
        // Read and write operation
        // std.debug.print("Read and write operation\n", .{});
        return -1;
    }

    if flags & O_CREAT != 0 {
        // Create file flag set
        // std.debug.print("Create file\n", .{});
        return -1;
    }

    if flags & O_TRUNC != 0 {
        // Truncate file flag set
        // std.debug.print("Truncate file\n", .{});
        return -1;
    }
    return 0;
}
