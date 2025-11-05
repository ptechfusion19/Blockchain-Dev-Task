use anchor_lang::prelude::*;

declare_id!("AiBawWM1dhGBfgs8dR8QidWhvFEu6MhfrtohbwCqeb8u");

#[program]
pub mod anchor_crud_item {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
