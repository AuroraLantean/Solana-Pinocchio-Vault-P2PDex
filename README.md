# Solana-Pinocchio

## Instroduction to Pinocchio

Pinocchio is a no external dependencies library to make Solana programs in Rust, like Anchor but without auto IDL generation, nor using solana-program. We manually use Shank to generate IDL, SolanaProgram to deploy it to a local network, then run TypeScript tests with IDL.

The only dependencies are types from the Solana SDK. This mitigates dependency issues and offers an efficient zero-copy library to write programs, optimized in terms of both compute units consumption and binary size.

### Why Pinocchio

- Zero-dependency. Additional dependencies can be added on
- High Performance Execution & Lower Compute Units
- Zero-copy types to avoid cloning or copying in deserialization
- Provide safe/unsafe function variants: safe Rust do all checks for you, while{} unsafe Rust comes with speed
- Small Binaries: no no_std the Rust standard library
- Fine-grained control over account fields,

The key difference is in the implementation of AccountView. While solana-program writes data to an AccountView struct that owns the data, Pinocchio’s AccountView struct is itself just a pointer to the underlying input data that represents the account. This reduces the amount of data needed to be copied, saving a lot of CUs.

See references:

- [Pinocchio: The Game-Changing SDK for Efficient ...
Solana Compass](https://solanacompass.com/learn/accelerate-25/scale-or-die-2025-no-strings-attached-programs-w-pinocchio)
- [Pinocchio Repository](<https://github.com/anza-xyz/pinocchio>)

### Why skipping solana-program

the solana-program crate brings overhead. extra deserialization, hidden allocations, and increased binary size.

### Why LiteSVM

LiteSVM is a lightweight library for testing Solana Programs. Unlike other testing approaches that spin up separate validator processes, LiteSVM embeds the VM inside your tests, making them execute much faster.

- Everything is Synchronous
- Direct State Manipulation
- Time Manipulation
- Errors are Immediate and Clear
- Better than Mollusk testing environment because LiteSVM runs a full, lightweight Solana Virtual Machine (SVM) for broader testing (Rust, TS for testing frontend libraries aka End-To-End testing, Python), offering greater realism and speed for complex scenarios. Additionally, LiteSVM offers Time Travel testing.

```rust
cargo add --dev litesvm litesvm-token solana-sdk
```

### Environment

Rust: 1.93.0 (254b59607 2026-01-19);
solana-cli: 3.0.14, 3.0.12 or 2.3.13;
BunJs:  1.3.8; PNPM: 10.28.1;
Linux Mint 22.3(Ubuntu Noble 24.04)

Install Solana CLI: <https://solana.com/docs/intro/installation> Or <https://docs.anza.xyz/cli/install>

Install Biome: <https://biomejs.dev/guides/getting-started/>

## Setup a new Pinocchio project

```bash
cargo new program-name --lib --edition 2021
cd program-name
cargo add pinocchio pinocchio-system pinocchio-log pinocchio-pubkey shank
bun init
```

Add config in `Cargo.toml`

```toml
[lib]
crate-type = ["lib", "cdylib"]
```

### Make Program ID

```bash
solana-keygen new -o target/deploy/pinocchio_vault_escrow-keypair.json
solana address -k target/deploy/pinocchio_vault_escrow-keypair.json
```

Paste it into

- lib.rs: declare_id! macro
- web3jsSetup.ts: vaultProgAddr

### Build the program

```bash
cargo build-sbf
```

### Make IDL via Shank for new instruction layout

```bash
cargo install shank-cli
shank idl -o idl
```

The idl folder in our project now contains pinocchio_vault_escrow.json which is our program's IDL.

### Make a client via @solana/kit and Codama

Codama takes the Shank IDL and emits a TypeScript client. The generated code includes instruction builders, account types, and small conveniences that keep your client code focused on composing transactions.

```bash
  pnpm install
  pnpm dlx codama init
```
✔ Where is your IDL located? (Supports Codama and Anchor IDLs). … idl/pinocchio_flashloan.json
✔ Which script preset would you like to use? › Generate JavaScript client, Generate Rust client
✔ [js] Where is the JavaScript client package located? … clients/js
✔ [rust] Where is the Rust client crate located? … clients/rust

```bash
  pnpm dlx codama run js
```

You'll see a `clients/js/src/generated` folder in our project with the program types our client code uses to send transactions to our program.

### Run Tests via NodeSVM in LiteSVM

Write tests in Rust:

```bash
cargo add --dev litesvm litesvm-token solana-sdk
```

Write tests in TypeScript
See tutorial: <https://litesvm.github.io/litesvm/tutorial.html>

```bash
pnpm add -D litesvm @solana/web3.js @solana/spl-token
bun test ./tests/litesvm1.ts
```

### Run Tests via LiteSVM

See tutorial: <https://www.litesvm.com/docs/getting-started>

### Run Tests via Solana-Test-Validator

Open two terminals at this project directory:
Run in terminal 1:

```bash
solana-test-validator -r
```

Build, deploy the Program locally, and run tests in terminal 2:

```bash
cargo build-sbf
solana program deploy --program-id target/deploy/pinocchio_vault_escrow-keypair.json target/deploy/pinocchio_vault_escrow.so --url localhost
bun test ./tests/test1.ts
```

### Pyth SDK for price feeds

Pyth Developer Hub: <https://docs.pyth.network/price-feeds/core/use-real-time-data/pull-integration/solana?ref=pyth-network.ghost.io>

Pyth SDK Crate: <https://crates.io/crates/pyth-solana-receiver-sdk>

### Surfpool

Why Surfpool <https://www.surfpool.run/>

- Fork Mainnet accounts
- Special RPC to manipulate time and state
- Set balances for any SOL/token
- Surfpool MCP for Cursor or Copilot
- Surfpool Cloud for team testing: `surfpool cloud start`; add your RPC URL into your txtx.yml; Copy runbooks/deployment/signers.localnet.tx into signers.surfnet.tx; Then run it `surfpool run deployment --env surfnet -u`

Examples: <https://github.com/txtx/surfpool-examples>

```bash
surfpool start --watch --network mainnet
surfpool run <program-method> --env surfnet -u
```

Get tokens at <https://cloud.txtx.run/faucet> into your local network. Check in terminal: `spl-token display <tokenMint> --output json`

### TODO

- Security: <https://dev.to/ola-zoll/i-built-a-hacking-playground-for-solana-so-you-dont-have-to-lose-real-money-learning-21df>
- LiteSVM Utility: <https://github.com/brimigs/anchor-litesvm>
- Deploy and Upload Program IDL to interact on Solana Explorers: <https://explorer.solana.com/address/dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN/idl?cluster=devnet>
- Solana Privacy: MagicBlocks, Orca, Acum, Noir
- Surfpool: Solana Mainnet Simulator with Native Defi support, account snapshot: <https://www.surfpool.run/>
- Yellowstone gRPC v11: for streaming data and indexing
- Test via LiteSVM + SolanaKit: SOL Transfer Example with Solana Kit <https://www.litesvm.com/docs/typescript/examples/sol-transfer>
- Codama can generate TS and Rust client: <https://solana.com/docs/programs/codama/clients>, but not yet Go client: <https://github.com/codama-idl/codama/issues/973>
- Mint2022 layout: <https://rareskills.io/post/token-2022>
- StackExchange: <https://solana.stackexchange.com/questions/23991/how-to-generate-a-go-client-from-pinocchio-rust>
- Anchor Go: <https://github.com/gagliardetto/anchor-go>
- Anchor Go fork by Fragmetric-labs: <https://github.com/fragmetric-labs/solana-anchor-go>
- Solana Go SDK: <https://github.com/gagliardetto/solana-go>
- Developing a Native Rust program and its Rust client: <https://solana.com/docs/programs/rust>
- Rust(2 years old): <https://github.com/cenwadike/solana-program-client>

- Solana Kite to replace some SolanaKit: <https://github.com/solanakite/kite>; AND <https://solanakite.org/docs>

- Test code in Rust: <https://rareskills.io/post/litesvm>, <https://github.com/quiknode-labs/you-will-build-a-solana-program>

### References

- Native Development: <https://solana.com/docs/programs/rust>
- Bun Js Test: <https://bun.com/docs/test>
- Solana Kit: <https://www.solanakit.com/docs/getting-started/send-transaction>
- Solana Kit Account: <https://github.com/anza-xyz/kit/tree/main/packages/accounts>
- LiteSVM Docs: <https://www.litesvm.com/docs/getting-started>
- LiteSVM GitHub: <https://github.com/LiteSVM/litesvm>
- LiteSVM Example by Quicknode: <https://github.com/quiknode-labs/you-will-build-a-solana-program>
- LiteSVM in JS: <https://litesvm.github.io/litesvm/tutorial.html>
- Gill: <https://www.gillsdk.com/docs/guides/tokens/create-token>
- Quicknode: <https://www.quicknode.com/guides/solana-development/pinocchio/how-to-build-and-deploy-a-solana-program-using-pinocchio>
- How to Build Programs with Pinocchio: <https://www.helius.dev/blog/pinocchio#how-is-pinocchio-more-performant-than-solana-program>
- Create Token Mint via Rust and JavaScript: <https://solana.com/docs/tokens/basics/create-mint>
- Create and Mint SPL Tokens via Anchor: <https://www.quicknode.com/guides/solana-development/anchor/create-tokens>
- Create Token Account via Anchor: <https://www.anchor-lang.com/docs/tokens/basics/create-token-account>
- Get Token Account: <https://solana.com/developers/cookbook/tokens/get-token-account>
- Account Deserialization by QuickNode: <https://www.quicknode.com/guides/solana-development/tooling/web3-2/account-deserialization>
- Solana Kit decoder with fixed size codec: <https://github.com/anza-xyz/kit/tree/main/packages/codecs-core#fixed-size-and-variable-size-codecs>
- Escrow + LiteSVM by QuickNode: <https://www.quicknode.com/guides/solana-development/tooling/litesvm>
