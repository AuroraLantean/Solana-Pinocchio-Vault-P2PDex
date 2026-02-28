use core::convert::TryFrom;
use pinocchio::{
  cpi::{Seed, Signer},
  error::ProgramError,
  AccountView, ProgramResult,
};
use pinocchio_log::log;

use crate::{
  ata_balc, check_ata, check_atoken_gpvbd, check_data_len, check_decimals, check_mint0a,
  check_rent_sysvar, check_sysprog, derive_pda1, executable, instructions::check_signer,
  none_zero_u64, parse_u64, rent_exempt_mint, rent_exempt_tokacct, writable, Ee, VAULT_SEED,
};

/// TokLgc: Users to Withdraw Tokens
pub struct TokLgcWithdraw<'a> {
  pub user: &'a AccountView, //signer
  pub from_ata: &'a AccountView,
  pub to_ata: &'a AccountView,
  pub vault: &'a AccountView,
  pub mint: &'a AccountView,
  pub token_program: &'a AccountView,
  pub system_program: &'a AccountView,
  pub atoken_program: &'a AccountView,
  pub rent_sysvar: &'a AccountView,
  pub vault_bump: u8,
  pub decimals: u8,
  pub amount: u64,
}
impl<'a> TokLgcWithdraw<'a> {
  pub const DISCRIMINATOR: &'a u8 = &6;

  pub fn process(self) -> ProgramResult {
    let TokLgcWithdraw {
      user,
      from_ata,
      to_ata,
      vault,
      mint,
      token_program,
      system_program,
      atoken_program: _,
      rent_sysvar,
      vault_bump,
      decimals,
      amount,
    } = self;
    log!("TokLgcWithdraw process()");

    if to_ata.is_data_empty() {
      log!("Make to_ata");
      pinocchio_associated_token_account::instructions::Create {
        funding_account: user,
        account: to_ata,
        wallet: user,
        mint,
        system_program,
        token_program,
      }
      .invoke()?;
      //Please upgrade to SPL Token 2022 for immutable owner support
    } else {
      log!("to_ata has data");
      check_ata(to_ata, user, mint)?;
      rent_exempt_tokacct(to_ata, rent_sysvar)?;
    }
    log!("ToATA is found/verified");

    //let bump_array = [vault_bump];
    let signer_seeds = [
      Seed::from(VAULT_SEED),
      Seed::from(user.address().as_ref()),
      Seed::from(core::slice::from_ref(&vault_bump)),
    ];
    let seed_signer = Signer::from(&signer_seeds);

    log!("Transfer Tokens");
    pinocchio_token::instructions::TransferChecked {
      from: from_ata,
      mint,
      to: to_ata,
      authority: vault,
      amount,
      decimals,
    }
    .invoke_signed(&[seed_signer])?;
    Ok(())
  }
}
impl<'a> TryFrom<(&'a [u8], &'a [AccountView])> for TokLgcWithdraw<'a> {
  type Error = ProgramError;

  fn try_from(value: (&'a [u8], &'a [AccountView])) -> Result<Self, Self::Error> {
    log!("TokLgcWithdraw try_from");
    let (data, accounts) = value;
    log!("accounts len: {}, data len: {}", accounts.len(), data.len());

    let [user, from_ata, to_ata, vault, mint, token_program, system_program, atoken_program, rent_sysvar] =
      accounts
    else {
      return Err(ProgramError::NotEnoughAccountKeys);
    };
    check_signer(user)?;
    executable(token_program)?;
    check_sysprog(system_program)?;
    check_atoken_gpvbd(atoken_program)?;
    check_rent_sysvar(rent_sysvar)?;

    writable(from_ata)?;
    check_ata(from_ata, vault, mint)?;
    writable(to_ata)?;
    //writable(config_pda)?;
    //check_pda(config_pda)?;

    //1+8: u8 takes 1, u64 takes 8 bytes
    check_data_len(data, 9)?;

    let decimals = data[0];
    let amount = parse_u64(&data[1..])?;
    log!("decimals: {}, amount: {}", decimals, amount);

    none_zero_u64(amount)?;
    ata_balc(from_ata, amount)?;

    let (expected_vault, vault_bump) = derive_pda1(user.address(), VAULT_SEED)?;
    if vault.address() != &expected_vault {
      return Err(Ee::VaultPDA.into());
    }

    log!("TokLgcWithdraw try_from 12");
    rent_exempt_mint(mint, rent_sysvar, 0)?;
    check_decimals(mint, decimals)?;
    check_mint0a(mint, token_program)?;

    Ok(Self {
      user,
      from_ata,
      to_ata,
      vault,
      mint,
      token_program,
      system_program,
      atoken_program,
      rent_sysvar,
      vault_bump,
      decimals,
      amount,
    })
  }
}
