use core::convert::TryFrom;
use pinocchio::{
  cpi::{Seed, Signer},
  error::ProgramError,
  sysvars::rent::Rent,
  AccountView, Address, ProgramResult,
};
use pinocchio_log::log;

use crate::{
  check_data_len, check_rent_sysvar, instructions::check_signer, none_zero_u64, parse_u64,
  writable, Ee, User, ID, PROG_ADDR,
};

/// Make User Token Offer
pub struct UserInit<'a> {
  pub user: &'a AccountView, //signer
  //pub mint: &'a AccountView,
  pub user_pda: &'a AccountView,
  // pub config_pda: &'a AccountView,
  // pub token_program: &'a AccountView,
  // pub system_program: &'a AccountView,
  // pub atoken_program: &'a AccountView,
  pub rent_sysvar: &'a AccountView,
  pub amount: u64,
  pub bump: u8,
}
impl<'a> UserInit<'a> {
  pub const DISCRIMINATOR: &'a u8 = &22;

  pub fn process(self) -> ProgramResult {
    let UserInit {
      user,
      //mint,
      user_pda,
      // config_pda,
      // token_program,
      // system_program,
      // atoken_program: _,
      rent_sysvar,
      amount,
      bump,
    } = self;
    log!("---------== process()");
    //config_pda.check_borrow_mut()?;
    //let _config: &mut Config = Config::from_account_view(&config_pda)?;

    let seed = [User::SEED, user.address().as_array()]; //&id.to_le_bytes()
    let seeds = &seed[..];

    let (expected_escrow, bump) = Address::find_program_address(seeds, &ID.into()); //TODO: may incur unknown cost
    if expected_escrow.ne(user_pda.address()) {
      return Ee::EscrowPDA.e();
    }
    //let expected_escrow = checked_create_program_address(seeds, &ID)?;
    log!("UserInit EscrowPDA verified");

    if user_pda.is_data_empty() {
      log!("Make User PDA 1");
      let rent = Rent::from_account_view(rent_sysvar)?;
      let lamports = rent.try_minimum_balance(User::LEN)?;

      log!("Make User PDA 2");
      let seeds = [
        Seed::from(User::SEED),
        Seed::from(user.address().as_ref()),
        Seed::from(core::slice::from_ref(&bump)),
      ];
      let seed_signer = Signer::from(&seeds);

      pinocchio_system::instructions::CreateAccount {
        from: user,
        to: user_pda,
        lamports,
        space: User::LEN as u64,
        owner: &PROG_ADDR,
      }
      .invoke_signed(&[seed_signer])?;
    } else {
      return Ee::EscrowExists.e();
    }
    log!("User is made");
    Ok(())
  }
}
impl<'a> TryFrom<(&'a [u8], &'a [AccountView])> for UserInit<'a> {
  type Error = ProgramError;

  fn try_from(value: (&'a [u8], &'a [AccountView])) -> Result<Self, Self::Error> {
    log!("UserInit try_from");
    let (data, accounts) = value;
    log!("accounts len: {}, data len: {}", accounts.len(), data.len());
    let data_len = 26;
    //2x u8 takes 2 + 2x u64 takes 16 bytes
    check_data_len(data, data_len)?;

    let [user, user_pda, rent_sysvar] = accounts else {
      return Err(ProgramError::NotEnoughAccountKeys);
    }; // config_pda, token_program, system_program, atoken_program,
    check_signer(user)?;
    //executable(token_program)?;
    //check_sysprog(system_program)?;
    //check_atoken_gpvbd(atoken_program)?;
    check_rent_sysvar(rent_sysvar)?;
    writable(user_pda)?;
    log!("UserInit try_from 4");

    let bump = data[0];
    let amount = parse_u64(&data[1..9])?;
    log!("bump: {}, amount: {}", bump, amount);
    none_zero_u64(amount)?;
    //ata_balc(maker_ata_x, amount_x)?;

    Ok(Self {
      user,
      user_pda,
      // config_pda,
      // token_program,
      // system_program,
      // atoken_program,
      rent_sysvar,
      amount,
      bump,
    })
  }
}
