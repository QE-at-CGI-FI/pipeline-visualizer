# Pipeline Visualizer - Quick Start Guide

## Getting Started

1. **Open the application**: Open `index.html` in your web browser, or run a local server (e.g., `python3 -m http.server 8080`)

2. **Initial State**: The pipeline starts with two fixed steps:
   - "A developer commits code" (start)
   - "Deploy to production" (end)

## Adding Steps

### From the Step Palette

1. Find the step you want in the **Available Steps** panel on the right
2. **Click and drag** the step into the main pipeline area
3. **Drop** it where you want it to appear in the flow

### Custom Steps

1. Click the **"+ Add Step"** button in the toolbar
2. Fill in:
   - **Step Name**: Give your step a descriptive name
   - **Type**: Choose from Delivery step, Deploy step, Package, or None
   - **Manual step**: Check if this requires manual intervention
3. Click **"Add Step"** to add it to your pipeline

## Reordering Steps

1. **Click and hold** on any step card (except the fixed start/end steps)
2. **Drag** it to a new position
3. **Release** to drop it in place
4. The lead time will automatically update

## Understanding Step Types

- **Delivery step**: Only "A developer commits code" has this type
- **Deploy step**: Deployment-related steps (e.g., "Deploy to production", "Deploy to Test")
- **Package**: Packaging/build artifacts
- **Manual step**: Requires human intervention (shown with an orange tag)

## Validating Your Pipeline

Click **"Validate Constraints"** to check if your pipeline follows the rules:

### Built-in Constraints

1. ✓ "Code is merged to main/trunk" → "Build release candidate"
2. ✓ "Build release candidate" → "Deploy to production"
3. ✓ "Package" types → "Deploy step" types
4. ✓ "Deploy step" types → "System test"

If validation fails:

- Violated constraints are listed in red
- Problematic steps are highlighted with red borders
- Rearrange steps to fix the issues

## Lead Time

The **Deployment Lead Time** shows the number of steps between:

- Start: "A developer commits code"
- End: "Deploy to production"

This helps you understand pipeline efficiency and identify bottlenecks.

## Removing Steps

1. Click the **"Remove"** button on any step card
2. Fixed steps (start and end) cannot be removed

## Clearing the Pipeline

Click **"Clear Pipeline"** to reset to the initial state (keeps only the fixed start/end steps)

## Example Usage Scenarios

### Scenario 1: Basic CI/CD Pipeline

1. Add "Code Review" after the commit step
2. Add "Code is merged to main/trunk"
3. Add "Build release candidate"
4. Add "Package"
5. Add "Deploy to Test"
6. Add "System test"
7. Validate to ensure all constraints are met

### Scenario 2: Adding Manual Approvals

1. Build your pipeline as above
2. Click "+ Add Step"
3. Create a "Manual Approval" step
4. Check "Manual step"
5. Place it where approval is needed (e.g., before production deployment)

## Tips

- Use the **step palette** for common steps
- Create **custom steps** for your specific workflow
- **Validate frequently** to catch constraint violations early
- The **greyed-out zones** (Before/After Pipeline) are reserved for future features

## Keyboard Shortcuts

Currently, all interactions are mouse-based. Keyboard support may be added in future versions.

## Troubleshooting

**Steps won't drag**: Make sure you're not trying to drag fixed steps (start/end)

**Validation fails**: Check the error messages and reorder steps to satisfy constraints

**Lead time not updating**: Try clicking "Validate Constraints" to refresh the view

## Next Steps

Experiment with different pipeline configurations to model your team's deployment process!
