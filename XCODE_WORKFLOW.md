# XCODE_WORKFLOW.md

## Purpose

This document defines how Xcode fits into the AI-OS workflow.

For Apple-native projects, Xcode is not optional. It is the platform truth layer for build behavior, previews, signing, simulator execution, entitlements, privacy prompts, and Apple framework integration.

## Role of Xcode

Xcode is responsible for:

- Swift compiler truth
- SwiftUI previews
- simulator/device execution
- app signing
- entitlements
- sandbox behavior
- Info.plist validation
- framework integration
- privacy permission prompts
- build settings
- scheme configuration

Zed may be used for fast editing, but Xcode remains authoritative for Apple-native correctness.

## Apple-Native Project Rule

For SwiftUI, macOS, iOS, watchOS, visionOS, AppKit, UIKit, SwiftData, CoreData, Keychain, entitlements, sandboxing, telemetry, local permissions, or background services:

- Xcode build verification is mandatory.
- Preview or simulator verification is preferred.
- Signing and entitlement changes require explicit human approval.
- Codex is not the default primary agent for high-risk Apple-native work.
- Local MLX review is preferred before implementation when privacy, permissions, or sandboxing are involved.

## Required Verification

At minimum:

```bash
xcodebuild -list
