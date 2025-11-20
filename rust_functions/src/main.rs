// Parameters & Arguments
fn another_function(num: i32) {
    println!("Another function called with number: {}", num);
}

// Statements and Expressions
fn statements_and_expressions() {
    let x = {
        let y = 3; // This is a statement
        y + 1 // This is an expression
    }; // the semicolon here ends the statement

    println!("The value of x is: {}", x);
}

// Return Values from Functions
fn sum_difference_product_quotient_remainder(num1: i32, num2: i32) -> (i32, i32, i32, i32, i32) {
    (
        num1 + num2,
        num1 - num2,
        num1 * num2,
        num1 / num2,
        num1 % num2,
    ) // No semicolon means this is an expression that will be returned
}

// Early Return with `return`
fn early_return_example(num: i32) -> i32 {
    if num < 0 {
        return -1; // Early return if condition is met
    }
    num * 2 // Normal return
}

fn main() {
    println!("Hello, world!");
    another_function(22);
    statements_and_expressions();
    let returned_values = sum_difference_product_quotient_remainder(10, 5);
    println!(
        "The returned values are: {:?}, {:?}, {:?}, {:?}, {:?}",
        returned_values.0,
        returned_values.1,
        returned_values.2,
        returned_values.3,
        returned_values.4
    ); // {:?} is used for printing tuples
    let early_returned_value = early_return_example(-10);
    println!("The early returned value is: {}", early_returned_value);
}
