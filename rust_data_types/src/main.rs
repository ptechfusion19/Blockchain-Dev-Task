mod practice;

fn main() {
    // Data Types in Rust

    // 1- Scalar Types
    let _integer: i32 = 42; // 32-bit signed integer
    let _float: f64 = 3.14; // 64-bit floating point
    let _boolean: bool = true; // Boolean type
    let _character: char = 'R'; // Character type

    // 2- Compound Types

    // Tuple
    let tuple: (i32, f64, char) = (500, 6.4, 'T');
    let (x, y, z) = tuple; // Destructuring a tuple
    println!("Tuple values: {}, {}, {}", x, y, z);

    // Array
    let array: [i32; 5] = [1, 2, 3, 4, 5]; // Array of 5 integers
    println!("Array values: {:?}", array);

    // 3- Custom Types

    // Struct
    struct Point {
        x: f64,
        y: f64,
    }
    let point = Point { x: 1.0, y: 2.0 };
    println!("Struct Point coordinates: ({}, {})", point.x, point.y);

    // // Enum
    enum Snack {
        Apple,
        // Banana,
        // Orange,
    }
    let my_snack = Snack::Apple; // I chose an Apple!
    let snack_message = match my_snack {
        Snack::Apple => "You selected an Apple!",
        // Snack::Banana => "You selected a Banana!",
        // Snack::Orange => "You selected an Orange!",
    };
    println!("{}", snack_message);

    // Practice function calls
    practice::integers();
    practice::numeral_systems();
    practice::floats();
    practice::numeric_operations();
    practice::boolean();
    practice::characters();
    practice::tuples();
    practice::arrays();
    practice::structs();
    practice::enums();
}
