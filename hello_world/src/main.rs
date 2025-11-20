fn main() {
    println!("It takes 20 seconds to print Hello, world!");
    std::thread::sleep(std::time::Duration::from_secs(20));
    println!("Hello, Cargo --release!");
    println!("It takes 3 seconds to exit...");
    std::thread::sleep(std::time::Duration::from_secs(3));
}
