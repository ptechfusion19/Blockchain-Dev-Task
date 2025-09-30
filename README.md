# Blockchain-Intern-Task

A Foundry-based example repo demonstrating on-chain governance using OpenZeppelin's Governor and ERC20Votes, plus a simple timelock and upgradeable-style execution flow. This project contains a minimal governance setup used for learning and testing: `GovToken` (ERC20Votes token), `MyGovernor` (Governor with timelock), `Timelock` (TimelockController wrapper), and a `Box` contract that governance can update.

---

## Table of Contents

* [Project Overview](#project-overview)
* [Files & Contracts](#files--contracts)
* [Prerequisites](#prerequisites)
* [Quickstart (build & test)](#quickstart-build--test)
* [Key Design & Test Notes](#key-design--test-notes)
* [Common Issues & Fixes](#common-issues--fixes)
* [Development Tips](#development-tips)
* [License](#license)

---

## Project Overview

This repo demonstrates a common DAO governance pattern:

1. A governance token (`GovToken`) that implements OpenZeppelin's `ERC20Votes` so balances can be snapshotted and delegated.
2. A `Governor` implementation (`MyGovernor`) configured with voting delays/periods, quorum fraction, and timelock-controlled execution.
3. A `Timelock` controller (based on `TimelockController`) that enforces a delay between queueing and execution.
4. A simple `Box` contract whose state (`store` / `getNumber`) is controlled by governance via proposals.

The test suite shows how to propose, vote, queue, and execute a proposal which calls `Box.store(...)` through the timelock.

---

## Files & Contracts

* `src/GovToken.sol` — ERC20 token integrated with `ERC20Votes` and `ERC20Permit`. Used to mint voting power for tests.
* `src/MyGovernor.sol` — Governor implementation combining settings, counting, votes, quorum fraction, and timelock control.
* `src/Timelock.sol` — Thin wrapper around OpenZeppelin `TimelockController` with a constructor that forwards the `msg.sender` as admin as needed.
* `src/Box.sol` — Simple contract with `store(uint256)` (onlyOwner) and `getNumber()`; ownership is transferred to the timelock in tests.
* `test/MyGovernorTest.t.sol` — Foundry test demonstrating governance flow (propose → vote → queue → execute).
* `foundry.toml` — Foundry project configuration and remappings.
* `lib/openzeppelin-contracts` — OpenZeppelin Contracts used in this project (v5-style API in this repo).

---

## Prerequisites

* [Foundry](https://book.getfoundry.sh/) installed (`forge`, `cast`).
* Solidity compiler (configured by Foundry; this repo used `solc 0.8.30` during development).
* `lib/openzeppelin-contracts` present (repo already expects OpenZeppelin v5-style contracts in `lib/`).

---

## Quickstart (build & test)

From project root:

```bash
# build
forge clean
forge build

# run all tests with verbose traces
forge test -vvv

# format and lint
forge fmt
forge lint
```

Notes:

* `foundry.toml` contains `remappings = ["@openzeppelin/contracts=lib/openzeppelin-contracts/contracts"]`. Keep the `lib` folder present for imports to resolve.

---

## Key Design & Test Notes

* Tests mint governance tokens to a test voter address, delegate voting power to that address, and then perform the entire governance lifecycle.
* `Box` ownership is transferred to the `Timelock` so a successful governance execution can call `store()`.
* The test advances block numbers using `vm.roll(...)` and timestamps using `vm.warp(...)`. For transitions, the tests advance **one block past** the proposal snapshot and deadline (`snapshot + 1`, `deadline + 1`) to ensure the Governor moves `Pending -> Active -> Succeeded` as expected.
* The Governor is configured in `MyGovernor` with a voting delay and voting period suitable for learning; you can reduce those for faster local iteration.

---

## Common Issues & Fixes (from development)

These are specific problems observed during development and how we resolved them:

1. **`Ownable` constructor (OZ v5)**

   * Error: `No arguments passed to the base constructor. Specify the arguments or mark "Box" as abstract.`
   * Fix: Call `Ownable(msg.sender)` from the contract constructor. Example:

     ```solidity
     constructor() Ownable(msg.sender) {}
     ```
   * Reason: OpenZeppelin v5 `Ownable` expects an `initialOwner` in the constructor.

2. **`ERC20Votes` checkpointing / governor not seeing voting power**

   * Symptom: Proposal stays `Pending` and never flips to `Active` even after `vm.roll(snapshot)`.
   * Fixes applied:

     * Implement OZ v5-required `_update` override in `GovToken` so votes/checkpoints are updated: `function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Votes) { super._update(from, to, value); }`
     * Forward `nonces(...)` correctly if required by your OZ version: `function nonces(address owner) public view override(ERC20Permit, Nonces) returns (uint256) { return super.nonces(owner); }`
   * Testing note: when advancing to the proposal snapshot, roll **one block past** the snapshot (`snapshot + 1`) so the Governor recognizes the active state.

3. **Block/timestamp advancement in tests**

   * Always pair `vm.roll` with `vm.warp` if your Governor uses timestamps for deadlines or other checks.
   * Use `snapshot + 1` and `deadline + 1` to avoid strict-equality pitfalls.

---

## Development Tips

* Use `forge test -vvv` during debugging to see traces and event logs — extremely helpful to inspect `proposalSnapshot`, `proposalDeadline`, and internal calls.
* For faster local dev, temporarily reduce `votingDelay` and `votingPeriod` in `MyGovernor` (only for tests/dev — don’t do this in production).
* Add additional unit tests for quorum fail cases, delegation edge cases, and timelock role permissions.
* Rename variables like `s_number` to `sNumber` if you want to silence Foundry linter `mixed-case-variable` warnings.

---

## Contributing

If you want to propose improvements:

1. Fork the repo and create a branch.
2. Add tests for the change and run `forge test` locally.
3. Open a PR describing the change and expected behavior.

---

## License

This project uses the MIT license. See `LICENSE` if present.


