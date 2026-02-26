use crate::{
  check_data_len, check_pda, executable, instructions::check_signer, parse_u16, parse_u64,
  to32bytes, writable, Ee,
};
use core::convert::TryFrom;
use pinocchio::{
  error::ProgramError, sysvars::instructions::INSTRUCTIONS_ID, AccountView, ProgramResult,
};
use pinocchio_log::log;

/// FlashloanBorrow
pub struct FlashloanBorrow<'a> {
  pub signer: &'a AccountView,
  pub lender_pda: &'a AccountView,
  pub loan_data: &'a AccountView,
  pub mint: &'a AccountView,
  pub instruction_sysvar: &'a AccountView,
  pub token_program: &'a AccountView,
  pub system_program: &'a AccountView,
  pub config_pda: &'a AccountView,
  pub token_accounts: &'a [AccountView],
  //pub lender_ata: &'a AccountView,
  //pub user_ata: &'a AccountView,
  pub bump: [u8; 1],
  pub fee: u16,
  pub amounts: &'a [u64],
} /*Flashloan{
  lender_pda, lender_ata,
  user_ata, mint, user(signer),
  config, sysvar_instructions,
  token_program, system_program }*/
impl<'a> FlashloanBorrow<'a> {
  pub const DISCRIMINATOR: &'a u8 = &22;

  pub fn process(self) -> ProgramResult {
    log!("FlashloanBorrow process()");
    Ok(())
  }
}
impl<'a> TryFrom<(&'a [u8], &'a [AccountView])> for FlashloanBorrow<'a> {
  type Error = ProgramError;

  fn try_from(value: (&'a [u8], &'a [AccountView])) -> Result<Self, Self::Error> {
    log!("FlashloanBorrow try_from");
    let (data, accounts) = value;
    log!("accounts len: {}, data len: {}", accounts.len(), data.len());
    //let instruction_data = LoanInstructionData::try_from(data)?;

    let [signer, lender_pda, loan_data, mint, instruction_sysvar, config_pda, token_program, system_program, token_accounts @ ..] =
      accounts
    else {
      return Err(ProgramError::NotEnoughAccountKeys);
    }; //lender_ata, user_ata
    check_signer(signer)?;
    writable(loan_data)?;
    executable(token_program)?;
    writable(config_pda)?;
    check_pda(config_pda)?;
    //check_mint0a(token_mint, token_program)?;

    if instruction_sysvar.address().ne(&INSTRUCTIONS_ID) {
      return Err(ProgramError::UnsupportedSysvar);
    }
    // Each loan requires a protocol_token_account and a borrower_token_account
    if (token_accounts.len() % 2).ne(&0) || token_accounts.len().eq(&0) {
      return Err(Ee::TokenAcctsLength.into());
    }
    if loan_data.try_borrow()?.len().ne(&0) {
      return Err(Ee::LoanDataAcct.into());
    }

    //-------== parse variadic data
    let (bump, data) = data.split_first().ok_or_else(|| Ee::ByteSizeForU8)?;

    let (fee, data) = data
      .split_at_checked(size_of::<u16>())
      .ok_or_else(|| Ee::ByteSizeForU16)?;
    let fee = u16::from_le_bytes(
      fee
        .try_into()
        .map_err(|_| ProgramError::InvalidInstructionData)?,
    );
    log!("fee: {}", fee);
    if data.len() % size_of::<u64>() != 0 {
      return Err(Ee::ByteSizeForU64.into());
    }
    //Deriving the protocol PDA with the fee creates isolated liquidity pools for each fee tier, eliminating the need to store fee data in accounts. This design is both safe and optimal since each PDA with a specific fee owns only the liquidity associated with that fee rate. If someone passes an invalid fee, the corresponding token account for that fee bracket will be empty, automatically causing the transfer to fail with insufficient funds.

    // Get the amount slice
    let amounts: &[u64] = unsafe {
      core::slice::from_raw_parts(data.as_ptr() as *const u64, data.len() / size_of::<u64>())
    };
    log!("amounts: {}", amounts);
    if amounts.len() != token_accounts.len() / 2 {
      return Err(Ee::AmountsLenVsTokenAcctLen.into());
    }
    Ok(Self {
      signer,
      lender_pda,
      loan_data,
      mint,
      instruction_sysvar,
      config_pda,
      token_program,
      system_program,
      token_accounts,
      //lender_ata, user_ata,
      bump: [*bump],
      fee,
      amounts,
    })
  }
}
