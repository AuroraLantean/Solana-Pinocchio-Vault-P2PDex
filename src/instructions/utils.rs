//use num_derive::FromPrimitive;
use crate::{SimpleAcct, Status, PROG_ADDR};
use pinocchio::{
  error::{ProgramError, ToStr},
  sysvars::{
    clock::Clock,
    rent::{Rent, RENT_ID},
    Sysvar,
  },
  AccountView, Address, ProgramResult,
};
use pinocchio_log::log; //logger::log_message
use pinocchio_token::state::{Mint, TokenAccount};
use pinocchio_token_2022::state::{Mint as Mint22, TokenAccount as TokenAccount22};
//use pyth_solana_receiver_sdk::price_update::PriceUpdateV2;
use hex::FromHex;
use thiserror::Error;

//TODO: put errors in error.rs ... https://learn.blueshift.gg/en/courses/pinocchio-for-dummies/pinocchio-errors
#[derive(Clone, Debug, Eq, Error, PartialEq)] //FromPrimitive
pub enum Ee {
  #[error("MethodDiscriminator")]
  MethodDiscriminator,
  #[error("Xyz001")]
  Xyz001,
  #[error("OnlyProgOwner")]
  OnlyProgOwner,
  #[error("OnlyAdmin")]
  OnlyAdmin,
  #[error("OnlyUser")]
  OnlyUser,
  #[error("OnlyMaker")]
  OnlyMaker,
  #[error("Xyz006")]
  Xyz006,
  #[error("NotWritable")]
  NotWritable,
  #[error("NotExecutable")]
  NotExecutable,
  #[error("TokenProgram")]
  TokenProgram,
  #[error("AtokenGPvbd")]
  AtokenGPvbd,
  #[error("SystemProgram")]
  SystemProgram,
  #[error("RentSysvar")]
  RentSysvar,
  #[error("Xyz013")]
  Xyz013,
  #[error("EscrowMintX")]
  EscrowMintX,
  #[error("EscrowMintY")]
  EscrowMintY,
  #[error("EscrowId")]
  EscrowId,
  #[error("MintNotAccepted")]
  MintNotAccepted,
  #[error("MintsAreTheSame")]
  MintsAreTheSame,
  #[error("Xyz019")]
  Xyz019,
  //Bytes for Numerical
  #[error("ZeroU128")]
  ZeroU128,
  #[error("ZeroU64")]
  ZeroU64,
  #[error("ZeroU32")]
  ZeroU32,
  #[error("ZeroU16")]
  ZeroU16,
  #[error("ZeroU8")]
  ZeroU8,
  //Bytes Sizes
  #[error("ByteSizeForU128")]
  ByteSizeForU128,
  #[error("ByteSizeForU64")]
  ByteSizeForU64,
  #[error("ByteSizeForU32")]
  ByteSizeForU32,
  #[error("ByteSizeForU16")]
  ByteSizeForU16,
  #[error("ByteSizeForU8")]
  ByteSizeForU8,
  //Byte Slice Sizes
  #[error("ByteSliceSize128")]
  ByteSliceSize128,
  #[error("ByteSliceSize64")]
  ByteSliceSize64,
  #[error("ByteSliceSize32")]
  ByteSliceSize32,
  #[error("ByteSliceSize10")]
  ByteSliceSize10,
  #[error("ByteSliceSize6")]
  ByteSliceSize6,
  #[error("Xyz035")]
  Xyz035,
  #[error("Xyz036")]
  Xyz036,
  #[error("Xyz037")]
  Xyz037,
  #[error("Xyz038")]
  Xyz038,
  #[error("NewAccountSize")]
  NewAccountSize,
  //Inputs
  #[error("InputDataLen")]
  InputDataLen,
  #[error("InputDataBump")]
  InputDataBump,
  #[error("ByteForBool")]
  ByteForBool,
  #[error("ByteForStatus")]
  ByteForStatus,
  #[error("InputAmountX")]
  InputAmountX,
  #[error("InputAmountY")]
  InputAmountY,
  #[error("EscrowDataEmpty")]
  EscrowDataEmpty,
  #[error("EscrowExists")]
  EscrowExists,
  #[error("EscrowIsForeign")]
  EscrowIsForeign,
  #[error("ConfigIsForeign")]
  ConfigIsForeign,
  //PDA
  #[error("PdaNoLamport")]
  PdaNoLamport,
  #[error("ForeignPDA")]
  ForeignPDA,
  #[error("ConfigPDA")]
  ConfigPDA,
  #[error("VaultPDA")]
  VaultPDA,
  #[error("AdminPDA")]
  AdminPDA,
  #[error("UserPDA")]
  UserPDA,
  #[error("EscrowPDA")]
  EscrowPDA,
  #[error("PythPDA")]
  PythPDA,
  #[error("Xyz058")]
  Xyz058,
  #[error("Xyz059")]
  Xyz059,
  //PDA Data Length
  #[error("ConfigDataLengh")]
  ConfigDataLengh,
  #[error("VaultDataLengh")]
  VaultDataLengh,
  #[error("AdminDataLengh")]
  AdminDataLengh,
  #[error("UserDataLengh")]
  UserDataLengh,
  #[error("EscrowDataLengh")]
  EscrowDataLengh,
  #[error("Xyz0065")]
  Xyz0065,
  #[error("Xyz066")]
  Xyz066,
  #[error("Xyz067")]
  Xyz067,
  #[error("Xyz068")]
  Xyz068,
  #[error("Xyz069")]
  Xyz069,
  //Mint Account
  #[error("DecimalsValue")]
  DecimalsValue,
  #[error("MintDataLen")]
  MintDataLen,
  #[error("MintOrMintAuthority")]
  MintOrMintAuthority,
  #[error("MintOrTokenProgram")]
  MintOrTokenProgram,
  #[error("Xyz074")]
  Xyz074,
  #[error("Xyz075")]
  Xyz075,
  #[error("EscrowInsuffTokenY")]
  EscrowInsuffTokenY,
  #[error("EscrowInsuffTokenX")]
  EscrowInsuffTokenX,
  #[error("MakerToWithdrawTokenY")]
  MakerToWithdrawTokenY,
  #[error("TakerInsuffTokenY")]
  TakerInsuffTokenY,
  //ATA
  #[error("AtaDataLen")]
  AtaDataLen,
  #[error("Ata22DataLen")]
  Ata22DataLen,
  #[error("AtaOrOwner")]
  AtaOrOwner,
  #[error("AtaOrMint")]
  AtaOrMint,
  #[error("AtaCheckX1")]
  AtaCheckX1,
  #[error("ForeignAta")]
  ForeignAta,
  #[error("AtaHasNoData")]
  AtaHasNoData,
  #[error("Xyz087")]
  Xyz087,
  #[error("NoRentExemptMintX")]
  NoRentExemptMintX,
  #[error("NoRentExemptMintY")]
  NoRentExemptMintY,
  //Token 2022
  #[error("Xyz90")]
  Xyz90,
  #[error("NoRentExemptTokAcct")]
  NoRentExemptTokAcct,
  #[error("NoRentExemptMint22")]
  NoRentExemptMint22,
  #[error("NoRentExemptTokAcct22")]
  NoRentExemptTokAcct22,
  #[error("Tok22AcctDiscOffset")]
  Tok22AcctDiscOffset,
  //Withdraw
  #[error("PdaToBeBelowRentExempt")]
  PdaToBeBelowRentExempt,
  #[error("ToWallet")]
  ToWallet,
  #[error("VaultNoLamport")]
  VaultNoLamport,
  #[error("VaultIsForeign")]
  VaultIsForeign,
  #[error("Xyz099")]
  Xyz099,
  #[error("Xyz100")]
  Xyz100,
  #[error("Xyz101")]
  Xyz101,
  //Math
  //ArithmeticOverflow exists
  #[error("MultiplyOverflow")]
  MultiplyOverflow,
  #[error("DividedByZero")]
  DividedByZero,
  #[error("Remainder")]
  Remainder,
  //Misc...
  #[error("EmptyData")]
  EmptyData,
  #[error("FunctionSelector")]
  FunctionSelector,
  #[error("ClockGet")]
  ClockGet,
  #[error("Xyz108")]
  Xyz108,
  #[error("Xyz109")]
  Xyz109,
  //Oracles...
  #[error("OracleNum")]
  OracleNum,
  #[error("OraclePriceInvalid")]
  OraclePriceInvalid,
  #[error("OraclePriceTooOld")]
  OraclePriceTooOld,
  #[error("PythPriceUpdateV2DataLen")]
  PythPriceUpdateV2DataLen,
  #[error("PythPriceUpdateV2Discriminator")]
  PythPriceUpdateV2Discriminator,
  #[error("PythPriceVerification")]
  PythPriceVerification,
  #[error("PythMismatchedFeedId")]
  PythMismatchedFeedId,
  #[error("PythFeedIdNonHexCharacter")]
  PythFeedIdNonHexCharacter,
  #[error("PythFeedIdMustBe32Bytes")]
  PythFeedIdMustBe32Bytes,
  #[error("SimpleAcctDataLen")]
  SimpleAcctDataLen,
  #[error("SimpleAcctOwner")]
  SimpleAcctOwner,
  #[error("SimpleAcctWriteAuthority")]
  SimpleAcctWriteAuthority,
  //Flashloan
  #[error("TokenAcctsLength")]
  TokenAcctsLength,
  #[error("LoanDataAcct")]
  LoanDataAcct,
  #[error("AmountsLenVsTokenAcctLen")]
  AmountsLenVsTokenAcctLen,
  //Final variant
  #[error("NotMapped")]
  NotMapped,
  //ProgramResult: AccountBorrowFailed
}
impl Ee {
  pub fn e(self) -> ProgramResult {
    Err(ProgramError::Custom(self as u32))
  }
}
impl From<Ee> for ProgramError {
  fn from(e: Ee) -> Self {
    ProgramError::Custom(e as u32)
  }
}
//Deserialize Errors from Raw Values
impl TryFrom<u32> for Ee {
  type Error = ProgramError;
  fn try_from(error: u32) -> Result<Self, Self::Error> {
    match error {
      0 => Ok(Ee::MethodDiscriminator),
      1 => Ok(Ee::Xyz001),
      2 => Ok(Ee::OnlyProgOwner),
      3 => Ok(Ee::OnlyAdmin),
      4 => Ok(Ee::OnlyUser),
      5 => Ok(Ee::OnlyMaker),
      6 => Ok(Ee::Xyz006),
      7 => Ok(Ee::NotWritable),
      8 => Ok(Ee::NotExecutable),
      9 => Ok(Ee::TokenProgram),
      10 => Ok(Ee::AtokenGPvbd),
      11 => Ok(Ee::SystemProgram),
      12 => Ok(Ee::RentSysvar),
      13 => Ok(Ee::Xyz013),
      14 => Ok(Ee::EscrowMintX),
      15 => Ok(Ee::EscrowMintY),
      16 => Ok(Ee::EscrowId),
      17 => Ok(Ee::MintNotAccepted),
      18 => Ok(Ee::MintsAreTheSame),
      19 => Ok(Ee::Xyz019),
      20 => Ok(Ee::ZeroU128),
      21 => Ok(Ee::ZeroU64),
      22 => Ok(Ee::ZeroU32),
      23 => Ok(Ee::ZeroU16),
      24 => Ok(Ee::ZeroU8),
      25 => Ok(Ee::ByteSizeForU128),
      26 => Ok(Ee::ByteSizeForU64),
      27 => Ok(Ee::ByteSizeForU32),
      28 => Ok(Ee::ByteSizeForU16),
      29 => Ok(Ee::ByteSizeForU8),
      30 => Ok(Ee::ByteSliceSize128),
      31 => Ok(Ee::ByteSliceSize64),
      32 => Ok(Ee::ByteSliceSize32),
      33 => Ok(Ee::ByteSliceSize10),
      34 => Ok(Ee::ByteSliceSize6),
      35 => Ok(Ee::Xyz035),
      36 => Ok(Ee::Xyz036),
      37 => Ok(Ee::Xyz037),
      38 => Ok(Ee::Xyz038),
      39 => Ok(Ee::NewAccountSize),
      40 => Ok(Ee::InputDataLen),
      41 => Ok(Ee::InputDataBump),
      42 => Ok(Ee::ByteForBool),
      43 => Ok(Ee::ByteForStatus),
      44 => Ok(Ee::InputAmountX),
      45 => Ok(Ee::InputAmountY),
      46 => Ok(Ee::EscrowDataEmpty),
      47 => Ok(Ee::EscrowExists),
      48 => Ok(Ee::EscrowIsForeign),
      49 => Ok(Ee::ConfigIsForeign),
      50 => Ok(Ee::PdaNoLamport),
      51 => Ok(Ee::ForeignPDA),
      52 => Ok(Ee::ConfigPDA),
      53 => Ok(Ee::VaultPDA),
      54 => Ok(Ee::AdminPDA),
      55 => Ok(Ee::UserPDA),
      56 => Ok(Ee::EscrowPDA),
      57 => Ok(Ee::PythPDA),
      58 => Ok(Ee::Xyz058),
      59 => Ok(Ee::Xyz059),
      60 => Ok(Ee::ConfigDataLengh),
      61 => Ok(Ee::VaultDataLengh),
      62 => Ok(Ee::AdminDataLengh),
      63 => Ok(Ee::UserDataLengh),
      64 => Ok(Ee::EscrowDataLengh),
      65 => Ok(Ee::Xyz0065),
      66 => Ok(Ee::Xyz066),
      67 => Ok(Ee::Xyz067),
      68 => Ok(Ee::Xyz068),
      69 => Ok(Ee::Xyz069),
      70 => Ok(Ee::DecimalsValue),
      71 => Ok(Ee::MintDataLen),
      72 => Ok(Ee::MintOrMintAuthority),
      73 => Ok(Ee::MintOrTokenProgram),
      74 => Ok(Ee::Xyz074),
      75 => Ok(Ee::Xyz075),
      76 => Ok(Ee::EscrowInsuffTokenY),
      77 => Ok(Ee::EscrowInsuffTokenX),
      78 => Ok(Ee::MakerToWithdrawTokenY),
      79 => Ok(Ee::TakerInsuffTokenY),
      80 => Ok(Ee::AtaDataLen),
      81 => Ok(Ee::Ata22DataLen),
      82 => Ok(Ee::AtaOrOwner),
      83 => Ok(Ee::AtaOrMint),
      84 => Ok(Ee::AtaCheckX1),
      85 => Ok(Ee::ForeignAta),
      86 => Ok(Ee::AtaHasNoData),
      87 => Ok(Ee::Xyz087),
      88 => Ok(Ee::NoRentExemptMintX),
      89 => Ok(Ee::NoRentExemptMintY),
      90 => Ok(Ee::Xyz90),
      91 => Ok(Ee::NoRentExemptTokAcct),
      92 => Ok(Ee::NoRentExemptMint22),
      93 => Ok(Ee::NoRentExemptTokAcct22),
      94 => Ok(Ee::Tok22AcctDiscOffset),
      95 => Ok(Ee::PdaToBeBelowRentExempt),
      96 => Ok(Ee::ToWallet),
      97 => Ok(Ee::VaultNoLamport),
      98 => Ok(Ee::VaultIsForeign),
      99 => Ok(Ee::Xyz099),
      100 => Ok(Ee::Xyz100),
      101 => Ok(Ee::Xyz101),
      102 => Ok(Ee::MultiplyOverflow),
      103 => Ok(Ee::DividedByZero),
      104 => Ok(Ee::Remainder),
      105 => Ok(Ee::EmptyData),
      106 => Ok(Ee::FunctionSelector),
      107 => Ok(Ee::ClockGet),
      108 => Ok(Ee::Xyz108),
      109 => Ok(Ee::Xyz109),
      110 => Ok(Ee::OracleNum),
      111 => Ok(Ee::OraclePriceInvalid),
      112 => Ok(Ee::OraclePriceTooOld),
      113 => Ok(Ee::PythPriceUpdateV2DataLen),
      114 => Ok(Ee::PythPriceUpdateV2Discriminator),
      115 => Ok(Ee::PythPriceVerification),
      116 => Ok(Ee::PythMismatchedFeedId),
      117 => Ok(Ee::PythFeedIdNonHexCharacter),
      118 => Ok(Ee::PythFeedIdMustBe32Bytes),
      119 => Ok(Ee::SimpleAcctDataLen),
      120 => Ok(Ee::SimpleAcctOwner),
      121 => Ok(Ee::SimpleAcctWriteAuthority),
      122 => Ok(Ee::TokenAcctsLength),
      123 => Ok(Ee::LoanDataAcct),
      124 => Ok(Ee::AmountsLenVsTokenAcctLen),
      _ => Err(Ee::NotMapped.into()),
    }
  }
}
//Human Readable Errors; TODO: arrange below
impl ToStr for Ee {
  fn to_str(&self) -> &'static str {
    match self {
      Ee::MethodDiscriminator => "MethodDiscriminator",
      Ee::Xyz001 => "Xyz001",
      Ee::OnlyProgOwner => "OnlyProgOwner",
      Ee::OnlyAdmin => "OnlyAdmin",
      Ee::OnlyUser => "OnlyUser",
      Ee::OnlyMaker => "OnlyMaker",
      Ee::Xyz006 => "Xyz006",

      Ee::NotWritable => "NotWritable",
      Ee::NotExecutable => "NotExecutable",
      Ee::TokenProgram => "TokenProgram",
      Ee::AtokenGPvbd => "AtokenGPvbd",
      Ee::SystemProgram => "SystemProgram",
      Ee::RentSysvar => "RentSysvar",
      Ee::Xyz013 => "Xyz013",
      Ee::EscrowMintX => "EscrowMintX",
      Ee::EscrowMintY => "EscrowMintY",
      Ee::EscrowId => "EscrowId",
      Ee::MintNotAccepted => "MintNotAccepted",
      Ee::MintsAreTheSame => "MintsAreTheSame",
      Ee::Xyz019 => "Xyz019",

      Ee::ZeroU128 => "ZeroU128",
      Ee::ZeroU64 => "ZeroU64",
      Ee::ZeroU32 => "ZeroU32",
      Ee::ZeroU16 => "ZeroU16",
      Ee::ZeroU8 => "ZeroU8",
      Ee::ByteSizeForU128 => "ByteSizeForU128",
      Ee::ByteSizeForU64 => "ByteSizeForU64",
      Ee::ByteSizeForU32 => "ByteSizeForU32",
      Ee::ByteSizeForU16 => "ByteSizeForU16",
      Ee::ByteSizeForU8 => "ByteSizeForU8",
      Ee::ByteSliceSize128 => "ByteSliceSize128",
      Ee::ByteSliceSize64 => "ByteSliceSize64",
      Ee::ByteSliceSize32 => "ByteSliceSize32",
      Ee::ByteSliceSize10 => "ByteSliceSize10",
      Ee::ByteSliceSize6 => "ByteSliceSize6",
      Ee::Xyz035 => "Xyz035",
      Ee::Xyz036 => "Xyz036",
      Ee::Xyz037 => "Xyz037",
      Ee::Xyz038 => "Xyz038",
      Ee::NewAccountSize => "NewAccountSize",

      Ee::InputDataLen => "InputDataLen",
      Ee::InputDataBump => "InputDataBump",
      Ee::ByteForBool => "ByteForBool",
      Ee::ByteForStatus => "ByteForStatus",
      Ee::InputAmountX => "InputAmountX",
      Ee::InputAmountY => "InputAmountY",
      Ee::EscrowDataEmpty => "EscrowDataEmpty",
      Ee::EscrowExists => "EscrowExists",
      Ee::EscrowIsForeign => "EscrowIsForeign",
      Ee::ConfigIsForeign => "ConfigIsForeign",

      Ee::PdaNoLamport => "PdaNoLamport",
      Ee::ForeignPDA => "ForeignPDA",
      Ee::ConfigPDA => "ConfigPDA",
      Ee::VaultPDA => "VaultPDA",
      Ee::AdminPDA => "AdminPDA",
      Ee::UserPDA => "UserPDA",
      Ee::PythPDA => "PythPDA",
      Ee::EscrowPDA => "EscrowPDA",
      Ee::Xyz058 => "Xyz058",
      Ee::Xyz059 => "Xyz059",

      Ee::ConfigDataLengh => "ConfigDataLengh",
      Ee::VaultDataLengh => "VaultDataLengh",
      Ee::AdminDataLengh => "AdminDataLengh",
      Ee::UserDataLengh => "UserDataLengh",
      Ee::EscrowDataLengh => "EscrowDataLengh",
      Ee::Xyz0065 => "Xyz0065",
      Ee::Xyz066 => "Xyz066",
      Ee::Xyz067 => "Xyz067",
      Ee::Xyz068 => "Xyz068",
      Ee::Xyz069 => "Xyz069",

      Ee::DecimalsValue => "DecimalsValue",
      Ee::MintDataLen => "MintDataLen",
      Ee::MintOrMintAuthority => "MintOrMintAuthority",
      Ee::MintOrTokenProgram => "MintOrTokenProgram",
      Ee::Xyz074 => "Xyz074",
      Ee::Xyz075 => "Xyz075",
      Ee::EscrowInsuffTokenY => "EscrowInsuffTokenY",
      Ee::EscrowInsuffTokenX => "EscrowInsuffTokenX",
      Ee::MakerToWithdrawTokenY => "MakerToWithdrawTokenY",
      Ee::TakerInsuffTokenY => "TakerInsuffTokenY",

      Ee::AtaDataLen => "AtaDataLen",
      Ee::Ata22DataLen => "Ata22DataLen",
      Ee::AtaOrOwner => "AtaOrOwner",
      Ee::AtaOrMint => "AtaOrMint",
      Ee::AtaCheckX1 => "AtaCheckX1",
      Ee::ForeignAta => "ForeignAta",
      Ee::AtaHasNoData => "AtaHasNoData",
      Ee::Xyz087 => "Xyz087",
      Ee::NoRentExemptMintX => "NoRentExemptMintX",
      Ee::NoRentExemptMintY => "NoRentExemptMintY",

      Ee::Xyz90 => "Xyz90",
      Ee::NoRentExemptTokAcct => "NoRentExemptTokAcct",
      Ee::NoRentExemptMint22 => "NoRentExemptMint22",
      Ee::NoRentExemptTokAcct22 => "NoRentExemptTokAcct22",
      Ee::Tok22AcctDiscOffset => "Tok22AcctDiscOffset",
      Ee::PdaToBeBelowRentExempt => "PdaToBeBelowRentExempt",
      Ee::ToWallet => "ToWallet",
      Ee::VaultNoLamport => "VaultNoLamport",
      Ee::VaultIsForeign => "VaultIsForeign",
      Ee::Xyz099 => "Xyz099",

      Ee::Xyz100 => "Xyz100",
      Ee::Xyz101 => "Xyz101",
      Ee::MultiplyOverflow => "MultiplyOverflow",
      Ee::DividedByZero => "DividedByZero",
      Ee::Remainder => "Remainder",
      Ee::EmptyData => "EmptyData",
      Ee::FunctionSelector => "FunctionSelector",
      Ee::ClockGet => "ClockGet",
      Ee::Xyz108 => "Xyz108",
      Ee::Xyz109 => "Xyz109",

      Ee::OracleNum => "OracleNum",
      Ee::OraclePriceInvalid => "OraclePriceInvalid",
      Ee::OraclePriceTooOld => "OraclePriceTooOld",
      Ee::PythPriceUpdateV2DataLen => "PythPriceUpdateV2DataLen",
      Ee::PythPriceUpdateV2Discriminator => "PythPriceUpdateV2Discriminator",
      Ee::PythPriceVerification => "PythPriceVerification",
      Ee::PythMismatchedFeedId => "PythMismatchedFeedId",
      Ee::PythFeedIdNonHexCharacter => "PythFeedIdNonHexCharacter",
      Ee::PythFeedIdMustBe32Bytes => "PythFeedIdMustBe32Bytes",
      Ee::SimpleAcctDataLen => "SimpleAcctDataLen",
      Ee::SimpleAcctOwner => "SimpleAcctOwner",
      Ee::SimpleAcctWriteAuthority => "SimpleAcctWriteAuthority",
      //Flashloan
      Ee::TokenAcctsLength => "TokenAcctsLength",
      Ee::LoanDataAcct => "LoanDataAcct",
      Ee::AmountsLenVsTokenAcctLen => "AmountsLenVsTokenAcctLen",
      //Final Variant
      Ee::NotMapped => "NotMapped",
    }
  }
}

//----------------== Account Verification
pub fn check_signer(account: &AccountView) -> ProgramResult {
  if !account.is_signer() {
    return Err(ProgramError::MissingRequiredSignature);
  }
  Ok(())
}
pub fn check_escrow_mints(mint_x: &AccountView, mint_y: &AccountView) -> ProgramResult {
  if mint_x.address() == mint_y.address() {
    return Ee::MintsAreTheSame.e();
  }
  Ok(())
}
pub fn check_mint0a(mint: &AccountView, token_program: &AccountView) -> ProgramResult {
  //if !mint.owned_by(mint_authority)
  if mint.data_len() != pinocchio_token::state::Mint::LEN {
    return Ee::MintDataLen.e();
  }
  if token_program.address().ne(&pinocchio_token::ID) {
    return Ee::TokenProgram.e();
  }
  unsafe {
    if mint.owner().ne(&pinocchio_token::ID) {
      return Ee::MintOrTokenProgram.e();
    }
  }
  Ok(())
}

pub fn check_mint0b(
  mint: &AccountView,
  mint_authority: &AccountView,
  token_program: &AccountView,
  decimals: u8,
) -> ProgramResult {
  let mint_info = pinocchio_token::state::Mint::from_account_view(mint)?;
  if mint_info
    .mint_authority()
    .is_some_and(|authority| mint_authority.address().ne(authority))
  {
    return Ee::MintOrMintAuthority.e();
  }
  if decimals != mint_info.decimals() {
    return Ee::DecimalsValue.e();
  }
  check_mint0a(mint, token_program)?;
  //TODO: over mint supply?
  Ok(())
}

pub fn check_mint22a(mint: &AccountView, token_program: &AccountView) -> ProgramResult {
  //if !mint.owned_by(mint_authority)
  if mint.data_len() != pinocchio_token_2022::state::Mint::BASE_LEN {
    return Ee::MintDataLen.e();
  }
  if token_program.address().ne(&pinocchio_token_2022::ID) {
    return Ee::TokenProgram.e();
  }
  unsafe {
    if mint.owner().ne(&pinocchio_token_2022::ID) {
      return Ee::MintOrTokenProgram.e();
    }
  }
  Ok(())
}
pub fn check_mint22b(
  mint: &AccountView,
  mint_authority: &AccountView,
  token_program: &AccountView,
  decimals: u8,
) -> ProgramResult {
  let mint_info = pinocchio_token_2022::state::Mint::from_account_view(mint)?;

  if mint_info
    .mint_authority()
    .is_some_and(|authority| mint_authority.address().ne(authority))
  {
    return Ee::MintOrMintAuthority.e();
  }
  if decimals != mint_info.decimals() {
    return Ee::DecimalsValue.e();
  }
  check_mint22a(mint, token_program)?;
  //TODO: over mint supply?
  Ok(())
}

//----------------== ATA
pub fn ata_balc(from_ata: &AccountView, amount: u64) -> ProgramResult {
  let from_ata_info = TokenAccount::from_account_view(from_ata)?;
  if from_ata_info.amount() < amount {
    return Err(ProgramError::InsufficientFunds);
  }
  Ok(())
}
pub fn ata_balc22(from_ata: &AccountView, amount: u64) -> ProgramResult {
  let from_ata_info = TokenAccount22::from_account_view(from_ata)?;
  if from_ata_info.amount() < amount {
    return Err(ProgramError::InsufficientFunds);
  }
  Ok(())
}
pub fn check_ata(ata: &AccountView, owner: &AccountView, mint: &AccountView) -> ProgramResult {
  let ata_len = ata.data_len();
  if ata_len == 0 {
    return Ee::AtaHasNoData.e();
  }
  if ata_len.ne(&pinocchio_token::state::TokenAccount::LEN) {
    return Ee::AtaDataLen.e();
  }
  let ata_info = pinocchio_token::state::TokenAccount::from_account_view(ata)?;
  if ata_info.owner().ne(owner.address()) {
    return Ee::AtaOrOwner.e();
  }
  if ata_info.mint().ne(mint.address()) {
    return Ee::AtaOrMint.e();
  }
  Ok(())
}
pub fn check_ata22(ata: &AccountView, owner: &AccountView, mint: &AccountView) -> ProgramResult {
  // token2022 ata has first 165 bytes the same as the legacy ata, but then some more data //log!("ata22 len:{}", ata.data_len());
  let ata_len = ata.data_len();
  if ata_len == 0 {
    return Ee::AtaHasNoData.e();
  }
  let ata_info = TokenAccount22::from_account_view(ata)?;
  if ata_info.owner().ne(owner.address()) {
    return Ee::AtaOrOwner.e();
  }
  if ata_info.mint().ne(mint.address()) {
    return Ee::AtaOrMint.e();
  }
  Ok(())
}
pub fn check_ata_x1(
  authority: &AccountView,
  token_program: &AccountView,
  mint: &AccountView,
  ata: &AccountView,
) -> ProgramResult {
  if Address::find_program_address(
    &[
      authority.address().as_array(),
      token_program.address().as_array(),
      mint.address().as_array(),
    ],
    &pinocchio_associated_token_account::ID,
  )
  .0
  .ne(ata.address())
  {
    return Ee::AtaCheckX1.e();
  }
  Ok(())
}
pub fn check_ata_escrow(
  ata: &AccountView,
  owner: &AccountView,
  mint: &AccountView,
) -> ProgramResult {
  // if !owner.owned_by(&ID) {
  //   return Ee::VaultIsForeign.e();
  // } ... escrow as owner may not exist yet
  let ata_len = ata.data_len();
  if ata_len == 0 {
    return Ee::AtaHasNoData.e();
  }
  if ata_len.ne(&pinocchio_token::state::TokenAccount::LEN) {
    return Ee::AtaDataLen.e();
  }
  let ata_info = pinocchio_token::state::TokenAccount::from_account_view(ata)?;
  if ata_info.owner().ne(owner.address()) {
    return Ee::AtaOrOwner.e();
  }
  if ata_info.mint().ne(mint.address()) {
    return Ee::AtaOrMint.e();
  }
  Ok(())
}
//----------------== PDAs and Other Accounts
pub fn derive_pda1(user: &Address, bstr: &[u8]) -> Result<(Address, u8), ProgramError> {
  log!("derive_pda1");
  //Address::find_program_address(&[b"vault", user.address().as_ref()], &ID)
  // let (pda, _bump) =
  Address::try_find_program_address(&[bstr, user.as_ref()], &PROG_ADDR)
    .ok_or_else(|| ProgramError::InvalidSeeds)
}
/*let pda = pubkey::create_program_address(
    &[PDA_SEED, &[self.datas.bump as u8]],
    &PROG_ADDR,
) */
pub fn check_pda(account: &AccountView) -> ProgramResult {
  if account.lamports() == 0 {
    return Ee::PdaNoLamport.e();
  }
  if !account.owned_by(&PROG_ADDR) {
    return Ee::ForeignPDA.e();
  }
  Ok(())
}
pub fn check_vault(input_vault: &AccountView, config_vault: &Address) -> ProgramResult {
  if input_vault.lamports() == 0 {
    return Ee::VaultNoLamport.e();
  }
  if !input_vault.owned_by(&PROG_ADDR) {
    return Ee::VaultIsForeign.e();
  }
  if input_vault.address() != config_vault {
    return Ee::ToWallet.e();
  }
  Ok(())
}
pub fn check_sysprog(account: &AccountView) -> ProgramResult {
  if account.address().ne(&pinocchio_system::ID) {
    return Ee::SystemProgram.e();
  }
  Ok(())
}
pub const ATOKENGPVBD: Address = pinocchio_associated_token_account::ID;
pub fn check_atoken_gpvbd(account: &AccountView) -> ProgramResult {
  if account.address().ne(&ATOKENGPVBD) {
    return Ee::AtokenGPvbd.e();
  }
  Ok(())
}
pub fn check_rent_sysvar(account: &AccountView) -> ProgramResult {
  if account.address().ne(&RENT_ID) {
    return Ee::RentSysvar.e();
  }
  Ok(())
}
//pub const SYSTEMPROGRAM: pinocchio_pubkey::reexport::Pubkey = solana_system_interface::program::ID;

//-------------==
/// Get a `FeedId` from a hex string.
///
/// Price feed ids are a 32 byte unique identifier for each price feed in the Pyth network.
/// They are sometimes represented as a 64 character hex string (with or without a 0x prefix).
pub fn get_feed_id_from_hex(input: &str) -> Result<[u8; 32], ProgramError> {
  let mut feed_id: [u8; 32] = [0; 32];
  match input.len() {
    66 => {
      feed_id.copy_from_slice(
        &<[u8; 32]>::from_hex(&input[2..]).map_err(|_| Ee::PythFeedIdNonHexCharacter)?,
      )
      //&hex::decode()
    }
    64 => feed_id
      .copy_from_slice(&<[u8; 32]>::from_hex(input).map_err(|_| Ee::PythFeedIdNonHexCharacter)?),
    _ => Ee::PythFeedIdMustBe32Bytes.e()?,
  }
  Ok(feed_id)
}

pub fn simple_acct(
  pda: &AccountView,
  write_authority_exp: &AccountView,
) -> Result<u64, ProgramError> {
  log!("simple_acct");
  pda.check_borrow_mut()?;
  let simple_acct: &SimpleAcct = SimpleAcct::from_account_view(&pda)?;
  log!("SimpleAcct::from_account_view() successful");
  let write_authority = simple_acct.write_authority();
  if write_authority.ne(write_authority_exp.address()) {
    return Err(Ee::SimpleAcctWriteAuthority.into());
  }
  log!("reading write_authority is successful");
  //log!("write_authority{}", write_authority);
  //log_message(write_authority); //invalid utf-8 sequence of 1 bytes from index 3: []
  //log_message(&write_authority.to_bytes());
  let price = simple_acct.price();
  log!("price: {}", price);
  Ok(price)
}

//----------------== Check Account Properties
pub fn writable(account: &AccountView) -> ProgramResult {
  if !account.is_writable() {
    return Ee::NotWritable.e();
  }
  Ok(())
}
pub fn executable(account: &AccountView) -> ProgramResult {
  if !account.executable() {
    return Ee::NotExecutable.e();
  }
  Ok(())
}

pub fn get_rent_exempt(
  account: &AccountView,
  rent_sysvar: &AccountView,
  data_len: usize,
) -> Result<u64, ProgramError> {
  if account.lamports() == 0 {
    return Err(ProgramError::UninitializedAccount);
  }
  let rent = Rent::from_account_view(rent_sysvar)?;
  let min_lam = rent.try_minimum_balance(data_len)?;
  log!("rent_exempt: {}", min_lam);
  Ok(min_lam)
}
pub fn rent_exempt(account: &AccountView, rent_sysvar: &AccountView) -> Result<(), ProgramError> {
  let rent = Rent::from_account_view(rent_sysvar)?;
  if !rent.is_exempt(account.lamports(), account.data_len()) {
    return Err(ProgramError::AccountNotRentExempt);
  }
  Ok(())
}
pub fn rent_exempt_mint22(account: &AccountView, rent_sysvar: &AccountView) -> ProgramResult {
  let rent = Rent::from_account_view(rent_sysvar)?;
  if !rent.is_exempt(account.lamports(), Mint22::BASE_LEN) {
    return Ee::NoRentExemptMint22.e();
  }
  Ok(())
}
//TODO: Mint and ATA from TokenLgc works. For mint and ATA from Token2022?
/// acc_type: 0 Mint, 1 TokenAccount
pub fn rent_exempt_mint(
  account: &AccountView,
  rent_sysvar: &AccountView,
  which_mint: u8,
) -> ProgramResult {
  let rent = Rent::from_account_view(rent_sysvar)?;
  if !rent.is_exempt(account.lamports(), Mint::LEN) {
    if which_mint == 0 {
      return Ee::NoRentExemptMintX.e();
    }
    return Ee::NoRentExemptMintY.e();
  }
  Ok(())
}

pub fn rent_exempt_tokacct(account: &AccountView, rent_sysvar: &AccountView) -> ProgramResult {
  let rent = Rent::from_account_view(rent_sysvar)?;
  if !rent.is_exempt(account.lamports(), TokenAccount::LEN) {
    return Ee::NoRentExemptTokAcct.e();
  }
  Ok(())
}
pub fn rent_exempt_tokacct22(account: &AccountView, rent_sysvar: &AccountView) -> ProgramResult {
  let rent = Rent::from_account_view(rent_sysvar)?;
  if !rent.is_exempt(account.lamports(), TokenAccount22::BASE_LEN) {
    return Ee::NoRentExemptTokAcct22.e();
  }
  Ok(())
}

pub fn not_initialized(account: &AccountView) -> ProgramResult {
  if account.lamports() > 0 {
    return Err(ProgramError::AccountAlreadyInitialized);
  }
  Ok(())
}
pub fn initialized(account: &AccountView) -> ProgramResult {
  if account.lamports() == 0 {
    return Err(ProgramError::UninitializedAccount);
  }
  Ok(())
}
pub fn empty_data(account: &AccountView) -> ProgramResult {
  if account.data_len() == 0 {
    return Ok(());
  }
  Ee::EmptyData.e()
}

//----------------== Check Input Values
pub fn check_data_len(data: &[u8], expected: usize) -> ProgramResult {
  if data.len() != expected {
    return Ee::InputDataLen.e();
  }
  Ok(())
}
pub fn check_decimals(mint: &AccountView, decimals: u8) -> ProgramResult {
  let mint_info = pinocchio_token::state::Mint::from_account_view(mint)?;
  if decimals != mint_info.decimals() {
    return Ee::DecimalsValue.e();
  }
  Ok(())
}
pub fn check_decimals_max(decimals: u8, max: u8) -> ProgramResult {
  if decimals > max {
    return Ee::DecimalsValue.e();
  }
  Ok(())
}

//----------------== Parse Functions
//cannot use std traits for u64, u32, ...
pub fn none_zero_u64(uint: u64) -> ProgramResult {
  if uint == 0u64 {
    return Ee::ZeroU64.e();
  }
  Ok(())
}
pub fn none_zero_u32(uint: u32) -> ProgramResult {
  if uint == 0u32 {
    return Ee::ZeroU32.e();
  }
  Ok(())
}
pub fn none_zero_u8(uint: u8) -> ProgramResult {
  if uint == 0u8 {
    return Ee::ZeroU8.e();
  }
  Ok(())
}
/// Parse a u64 from u8 array
pub fn parse_u64(data: &[u8]) -> Result<u64, ProgramError> {
  let bytes: [u8; 8] = data.try_into().or_else(|_e| Err(Ee::ByteSizeForU64))?;

  let amt = u64::from_le_bytes(bytes);
  // let amount = u64::from_le_bytes([data[0], data[1], data[2], data[3], data[4], data[5], data[6], data[7]]);
  Ok(amt)
}
pub fn parse_u32(data: &[u8]) -> Result<u32, ProgramError> {
  let bytes: [u8; 4] = data.try_into().or_else(|_e| Err(Ee::ByteSizeForU32))?;

  let amt = u32::from_le_bytes(bytes);
  // let amount = u64::from_le_bytes([data[0], data[1], data[2], data[3]]);
  Ok(amt)
}
pub fn parse_u16(data: &[u8]) -> Result<u16, ProgramError> {
  let bytes: [u8; 2] = data.try_into().or_else(|_e| Err(Ee::ByteSizeForU16))?;

  let amt = u16::from_le_bytes(bytes);
  // let amount = u64::from_le_bytes([data[0], data[1], data[2], data[3]]);
  Ok(amt)
}
pub fn to32bytes(byte_slice: &[u8]) -> Result<&[u8; 32], ProgramError> {
  let bytes: &[u8; 32] = byte_slice.try_into().map_err(|_| Ee::ByteSliceSize32)?;
  //let mut str_u8array = [0u8; 32];
  //str_u8array.copy_from_slice(&data[10..42]);
  return Ok(bytes);
}
pub fn to10bytes(byte_slice: &[u8]) -> Result<&[u8; 10], ProgramError> {
  let bytes: &[u8; 10] = byte_slice.try_into().map_err(|_| Ee::ByteSliceSize10)?;
  return Ok(bytes);
}
pub fn to6bytes(byte_slice: &[u8]) -> Result<&[u8; 6], ProgramError> {
  let bytes: &[u8; 6] = byte_slice.try_into().map_err(|_| Ee::ByteSliceSize6)?;
  return Ok(bytes);
}
pub fn u8_to_bool(v: u8) -> Result<bool, ProgramError> {
  match v {
    0 => Ok(false),
    1 => Ok(true),
    _ => Err(Ee::ByteForBool.into()),
  }
}
pub fn u8_to_status(v: u8) -> Result<Status, ProgramError> {
  match v {
    0 => Ok(Status::Waiting),
    1 => Ok(Status::Active),
    2 => Ok(Status::Expired),
    3 => Ok(Status::Paused),
    4 => Ok(Status::Canceled),
    _ => Err(Ee::ByteForStatus.into()),
  }
}
//----------------== Balance
pub fn sol_balc(from: &AccountView, amount: u64) -> ProgramResult {
  if from.lamports() < amount {
    return Err(ProgramError::InsufficientFunds);
  }
  Ok(())
}

//----------------== Token 2022 Interface
const TOKEN_2022_ACCOUNT_DISCRIMINATOR_OFFSET: usize = 165;
pub const TOKEN_2022_MINT_DISCRIMINATOR: u8 = 0x01;
pub const TOKEN_2022_TOKEN_ACCOUNT_DISCRIMINATOR: u8 = 0x02;

pub fn check_mint_interface(mint: &AccountView) -> ProgramResult {
  if !mint.owned_by(&pinocchio_token_2022::ID) {
    //legacy token
    if !mint.owned_by(&pinocchio_token::ID) {
      return Ee::MintOrTokenProgram.e();
    } else {
      if mint.data_len().ne(&pinocchio_token::state::Mint::LEN) {
        return Ee::MintDataLen.e();
      }
    }
  } else {
    //Token2022
    let data = mint.try_borrow()?;

    if data.len().ne(&pinocchio_token::state::Mint::LEN) {
      if data.len().le(&TOKEN_2022_ACCOUNT_DISCRIMINATOR_OFFSET) {
        return Ee::Ata22DataLen.e();
      }
      if data[TOKEN_2022_ACCOUNT_DISCRIMINATOR_OFFSET].ne(&TOKEN_2022_MINT_DISCRIMINATOR) {
        return Ee::Tok22AcctDiscOffset.e();
      }
    }
  }
  Ok(())
}

pub fn check_tokacct_interface(ata: &AccountView) -> ProgramResult {
  if !ata.owned_by(&pinocchio_token_2022::ID) {
    //Legacy ATA
    if !ata.owned_by(&pinocchio_token::ID) {
      return Ee::ForeignAta.e();
    } else {
      if ata
        .data_len()
        .ne(&pinocchio_token::state::TokenAccount::LEN)
      {
        return Ee::AtaDataLen.e();
      }
    }
  } else {
    //Token2022 ATA
    let data = ata.try_borrow()?;

    if data.len().ne(&pinocchio_token::state::TokenAccount::LEN) {
      if data.len().le(&TOKEN_2022_ACCOUNT_DISCRIMINATOR_OFFSET) {
        return Ee::Ata22DataLen.e();
      }
      if data[TOKEN_2022_ACCOUNT_DISCRIMINATOR_OFFSET].ne(&TOKEN_2022_TOKEN_ACCOUNT_DISCRIMINATOR) {
        return Ee::Tok22AcctDiscOffset.e();
      }
    }
  }
  Ok(())
}

pub fn get_time() -> Result<u32, ProgramError> {
  let clock = Clock::get().map_err(|_| Ee::ClockGet)?;
  let time = clock.unix_timestamp as u32;
  log!("Solana time: {}", time);
  Ok(time)
}
pub fn get_time_i64() -> Result<i64, ProgramError> {
  let clock = Clock::get().map_err(|_| Ee::ClockGet)?;
  let time = clock.unix_timestamp;
  log!("Solana time: {}", time);
  Ok(time)
}
