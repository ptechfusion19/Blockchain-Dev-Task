fn main() {
    let x: i32 = 5;
    println!("The Value of x is: {}", x);

    // cannot do this because x is defined as an integer
    // x = "Changed the value of x that was an integer to a string";
    // println!("The Value of x after shadowing is: {}", x);

    {
        let x: i32 = x * 2;
        println!("The Value of x inside the inner scope is: {}", x);
    }

    let x: i32 = x + 1;
    println!("The Value of x after shadowing is: {}", x);

    println!("It takes 3 seconds to exit...");
    std::thread::sleep(std::time::Duration::from_secs(3));

    let y;
    y = 5;
    println!("The Value of y is: {}", y);

    const MAX_POINTS: u32 = 100_000;
    println!("The Value of the constant MAX_POINTS is: {}", MAX_POINTS);

    // We can not declare constants like this
    // const SECONDS_IN_A_MINUTE: u32;
    // SECONDS_IN_A_MINUTE = 60; // cannot assign to this expression
    // println!(
    //     "The Value of the constant SECONDS_IN_A_MINUTE is: {}",
    //     SECONDS_IN_A_MINUTE
    // );

    // Cannot do Shadowing on constants
    // const MAX_POINTS: u32 = 10_000;
    // println!(
    //     "The Value of the constant MAX_POINTS after shadowing is: {}",
    //     MAX_POINTS
    // );


    // Constants cannot be mutable!
    // const mut SECONDS_IN_A_MINUTE: u32 = 60;
    // println!(
    //     "The Value of the constant SECONDS_IN_A_MINUTE is: {}",
    //     SECONDS_IN_A_MINUTE
    // );
}
