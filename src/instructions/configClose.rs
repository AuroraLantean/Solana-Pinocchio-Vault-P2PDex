use core::convert::TryFrom;
use pinocchio::{error::ProgramError, AccountView, ProgramResult};
use pinocchio_log::log;

use crate::{check_data_len, check_pda, close_pda, instructions::check_signer, writable, Config};

/// Close PDA
pub struct CloseConfigPda<'a> {
  pub authority: &'a AccountView,
  pub config_pda: &'a AccountView,
  pub dest: &'a AccountView,
}
impl<'a> CloseConfigPda<'a> {
  pub const DISCRIMINATOR: &'a u8 = &14;

  pub fn process(self) -> ProgramResult {
    let CloseConfigPda {
      authority: _,
      config_pda,
      dest,
    } = self;
    log!("CloseConfigPda process()");
    close_pda(config_pda, dest)?;
    Ok(())
  }
}
impl<'a> TryFrom<(&'a [u8], &'a [AccountView])> for CloseConfigPda<'a> {
  type Error = ProgramError;

  fn try_from(value: (&'a [u8], &'a [AccountView])) -> Result<Self, Self::Error> {
    log!("CloseConfigPda try_from");
    let (data, accounts) = value;
    log!("accounts len: {}, data len: {}", accounts.len(), data.len());
    check_data_len(data, 0)?;

    let [authority, config_pda, dest] = accounts else {
      return Err(ProgramError::NotEnoughAccountKeys);
    };
    check_signer(authority)?;
    writable(config_pda)?;
    check_pda(config_pda)?;
    log!("TryFrom 1");

    config_pda.check_borrow_mut()?;
    let config: &mut Config = Config::from_account_view(&config_pda)?;
    log!("TryFrom 2");

    if config.admin().ne(authority.address()) && config.prog_owner().ne(authority.address()) {
      return Err(ProgramError::IncorrectAuthority);
    }
    Ok(Self {
      authority,
      config_pda,
      dest,
    })
  }
}
