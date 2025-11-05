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

#[account]
pub struct Item {
    pub owner: Pubkey,
    pub id: u64,
    pub name: String,
    pub value: u32,
    pub bump: u8,
}

impl Item {
    pub const NAME_MAX_LEN: usize = 50;
    pub const LEN: usize = 8
        + 32 // owner
        + 8  // id: u64
        + 4  // string prefix
        + Self::NAME_MAX_LEN // max string bytes
        + 4  // value: u32
        + 1; // bump: u8
}

#[derive(Accounts)]
pub struct CreateItem<'info> {

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init,
        payer = user,
        space = 8 + Item::LEN,
        seeds = [b"item", user.key().as_ref(), &id.to_le_bytes()],
        bump,
    )]
    pub item: Account<'info, Item>,
    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
#[instruction(id: u64)]
pub struct UpdateItem<'info> {

    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"item", owner.key().as_ref(), &id.to_le_bytes()],
        bump = item.bump,
        has_one = owner,
    )]
    pub item: Account<'info, Item>,
}

#[derive(Accounts)]
#[instruction(id: u64)]
pub struct DeleteItem<'info> {

    pub owner: Signer<'info>,

    #[account(
        mut,
        closes = owner,
        seeds = [b"item", owner.key().as_ref(), &id.to_le_bytes()],
        bump = item.bump,
        has_one = owner,
    )]
    pub item: Account<'info, Item>,
}

#[derive(Accounts)]
#[instruction(id: u64)]
pub struct ReadItem<'info> {

    pub owner: UncheckedAccount<'info>,

    #[account(
        seeds = [b"item", owner.key().as_ref(), &id.to_le_bytes()],
        bump = item.bump,
    )]
    pub item: Account<'info, Item>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Name exceeds maximum length(50 bytes)")]
    NameTooLong = 6000,

    #[msg("Unauthorized")]
    Unauthorized,

    #[msg("Invalid input")]
    InvalidInput,
}
