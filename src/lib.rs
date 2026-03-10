/*lib.rs serves as your program’s entrypoint
- takes in the program ID, accounts, and instruction data, then reads the first byte as a discriminator to determine which method to call*/
#![no_std]
#![allow(unexpected_cfgs)]
use pinocchio::{entrypoint, error::ProgramError, AccountView, Address, ProgramResult};
use pinocchio_pubkey::declare_id;

//#[cfg(not(feature = "no-entrypoint"))]
entrypoint!(process_instruction);

pub mod instructions;
pub use instructions::*;
pub mod state;
pub use state::*;

#[cfg(test)]
mod litesvm1;
#[cfg(test)]
mod litesvm_helpers;

declare_id!("A9TPi1RSW5apQcZch9CUz5EnuyfSF773zxndJowMrcK3"); //crate::ID
pub const PROG_ADDR: Address = Address::new_from_array(ID);
pub const TOKEN_LGC_ADDR: Address =
  Address::from_str_const("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
pub const TOKEN_2022_ADDR: Address =
  Address::from_str_const("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

fn process_instruction(
  program_id: &Address,
  accounts: &[AccountView],
  instruction_data: &[u8],
) -> ProgramResult {
  if program_id.ne(&PROG_ADDR) {
    return Err(ProgramError::IncorrectProgramId);
  }
  // `split_first` separates the first byte (discriminator) from the rest (payload).
  let (discriminator, data) = instruction_data
    .split_first()
    .ok_or_else(|| ProgramError::InvalidInstructionData)?;

  //reads the first byte as a discriminator to determine which method to call (here: 0 = DepositSol, 1 = WithdrawSol).
  match discriminator {
    DepositSol::DISCRIMINATOR => DepositSol::try_from((data, accounts))?.process(),
    WithdrawSol::DISCRIMINATOR => WithdrawSol::try_from((data, accounts))?.process(),
    TokenLgcInitMint::DISCRIMINATOR => TokenLgcInitMint::try_from((data, accounts))?.process(),
    TokenLgcInitAta::DISCRIMINATOR => TokenLgcInitAta::try_from((data, accounts))?.process(),
    TokLgcMintToken::DISCRIMINATOR => TokLgcMintToken::try_from((data, accounts))?.process(),
    TokLgcDeposit::DISCRIMINATOR => TokLgcDeposit::try_from((data, accounts))?.process(),
    TokLgcWithdraw::DISCRIMINATOR => TokLgcWithdraw::try_from((data, accounts))?.process(),
    TokLgcPay::DISCRIMINATOR => TokLgcPay::try_from((data, accounts))?.process(),
    TokLgcRedeem::DISCRIMINATOR => TokLgcRedeem::try_from((data, accounts))?.process(),
    Token2022InitMint::DISCRIMINATOR => Token2022InitMint::try_from((data, accounts))?.process(),
    Token2022InitAta::DISCRIMINATOR => Token2022InitAta::try_from((data, accounts))?.process(),
    Token2022MintToken::DISCRIMINATOR => Token2022MintToken::try_from((data, accounts))?.process(),
    InitConfig::DISCRIMINATOR => InitConfig::try_from((data, accounts))?.process(),
    ConfigUpdate::DISCRIMINATOR => ConfigUpdate::try_from((data, accounts))?.process(),
    CloseConfigPda::DISCRIMINATOR => CloseConfigPda::try_from((data, accounts))?.process(),
    EscrowTokMake::DISCRIMINATOR => EscrowTokMake::try_from((data, accounts))?.process(),
    EscrowTokTake::DISCRIMINATOR => EscrowTokTake::try_from((data, accounts))?.process(),
    EscrowTokWithdraw::DISCRIMINATOR => EscrowTokWithdraw::try_from((data, accounts))?.process(),
    EscrowTokCancel::DISCRIMINATOR => EscrowTokCancel::try_from((data, accounts))?.process(),
    ConfigResize::DISCRIMINATOR => ConfigResize::try_from((data, accounts))?.process(),
    Config2Update::DISCRIMINATOR => Config2Update::try_from((data, accounts))?.process(),
    OraclesRead::DISCRIMINATOR => OraclesRead::try_from((data, accounts))?.process(),
    //UserInit::DISCRIMINATOR => UserInit::try_from((data, accounts))?.process(),
    _ => Err(Ee::MethodDiscriminator.into()),
  } //file names start with a lower case + Camel cases, but struct names start with Upper case + Camel cases!
}
