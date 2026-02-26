use crate::{
  check_data_len, check_pda, executable, instructions::check_signer, parse_u64, to32bytes,
  writable, Ee,
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
  pub amount: u64,
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
    let data_size1 = 9;
    check_data_len(data, data_size1)?;

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
    let amount = parse_u64(&data[1..9])?;
    log!("amount: {}", amount);
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
      amount,
    })
  }
}
