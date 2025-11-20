pub fn integers() {
    // Integer

    // Length   Signed  Unsigned
    // 8 bits    i8      u8
    // 16 bits   i16     u16
    // 32 bits   i32     u32
    // 64 bits   i64     u64
    // 128 bits  i128    u128
    // arch      isize   usize

    let small_number: u8 = 255; // Maximum value for u8
    let large_number: u128 = 340_282_366_920_938_463_463_374_607_431_768_211_455; // Maximum value for u128
    let small_number1: i8 = 127; // Maximum value for i8
    let large_number1: i128 = 18_446_744_073_709_551_615; // Maximum value for i128

    println!("Small number (u8): {}", small_number);
    println!("Large number (u128): {}", large_number);
    println!("Small number (i8): {}", small_number1);
    println!("Large number (i128): {}", large_number1);
}

pub fn numeral_systems() {
    // Numeral         System               Representation           Example                   Description
    // Decimal         Base 10              0-9                      255                       common form
    // Hexadecimal     Base 16              0-9, A-F                 0xff                      prefix with 0x
    // Octal           Base 8               0-7                      0o377                     prefix with 0o
    // Binary          Base 2               0-1                      0b1111_1111               prefix with 0b
    // Bytes(u8 only)  ASCII characters     8 bits                   b'A'                      prefix with b''

    let decimal: i32 = 255; // Decimal
    let hexadecimal: i32 = 0xff; // Hexadecimal
    let octal: i32 = 0o377; // Octal
    let binary: i32 = 0b1111_1111; // Binary
    let byte: u8 = b'A'; // Byte (ASCII character)

    println!("Decimal: {}", decimal);
    println!("Hexadecimal: {}", hexadecimal);
    println!("Octal: {}", octal);
    println!("Binary: {}", binary);
    println!("Byte (ASCII): {}", byte);
}

pub fn floats() {
    // Floating-Point Types

    // Length      Type
    // 32 bits     f32
    // 64 bits     f64

    let float_32: f32 = 3.14; // 32-bit floating point
    let float_64: f64 = 2.718281828459045; // 64-bit floating point

    println!("32-bit float: {}", float_32);
    println!("64-bit float: {}", float_64);
}

pub fn numeric_operations() {
    // Numeric Operations

    let a: i32 = 10;
    let b: i32 = 3;

    let sum = a + b; // Addition
    let difference = a - b; // Subtraction
    let product = a * b; // Multiplication
    let quotient = a / b; // Division
    let remainder = a % b; // Modulus

    println!("Sum: {}", sum);
    println!("Difference: {}", difference);
    println!("Product: {}", product);
    println!("Quotient: {}", quotient);
    println!("Remainder: {}", remainder);
}

pub fn boolean() {
    // Boolean Type

    let is_rust_fun = true; // implicit declaration
    let is_sky_green: bool = false; // explicit declaration

    println!(
        "Is Rust fun? Yes, {}! and Is the sky green? No, {}!",
        is_rust_fun, is_sky_green
    );

    if is_rust_fun {
        println!("Indeed, Rust is fun!");
    } else {
        println!("Oh no, Rust is not fun?");
    }

    let not_green = !is_sky_green; // Negation
    println!("Is Sky not green? {}", not_green);

    // let b: bool;
    // println!("b = {}", b);
}

pub fn characters() {
    // Character Type

    let letter: char = 'R'; // Single character
    let emoji: char = '😊'; // Emoji character
    let accented: char = 'é'; // Accented character

    println!("Letter: {}", letter);
    println!("Emoji: {}", emoji);
    println!("Accented character: {}", accented);

    for char in ['a', 'β', '中', '😊'].iter() {
        println!("Character: {}", char);
    }

}

pub fn tuples() {
    // Tuple Type

    let person: (&str, i32, f64) = ("Abdullah", 30, 5.5); // Tuple with mixed types

    let (name, age, height) = person; // Destructuring
    println!("Name: {}, Age: {}, Height: {}", name, age, height);

    let second_element = person.1; // Accessing by index
    println!("Second element (Age): {}", second_element);
}
