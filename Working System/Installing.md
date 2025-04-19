# Internet Domain System for KubeJS

This repository contains scripts for integrating an Internet Domain System into your Minecraft server using KubeJS.

## Requirements

Before installing, make sure your server has the following mods installed:

- **[KubeJS](https://www.curseforge.com/minecraft/mc-mods/kubejs)**  
- **[KubeJS + CC:Tweaked Compatibility Mod](https://www.curseforge.com/minecraft/mc-mods/kubejs-computercraft)**  
  This is required for the system to work with CC:Tweaked.
- **The mod included in the project named _The Network_**  
  This script system is designed to work specifically with the mod provided in that project. Make sure it's installed and up to date.

> ⚠️ These scripts will not work without all of the above mods installed!

## Installation

1. **Download the scripts** from this repository.

2. **Place the files in the correct directories** inside your server’s `kubejs` folder:

   - Copy `persistent_network_data.js` and `domain_tick.js` into:
     ```
     kubejs/server_scripts
     ```

   - Copy `internet_domain_peripherals.js` into:
     ```
     kubejs/startup_scripts
     ```

3. **Restart your server** to apply the changes.

## Notes

- These scripts are designed to work together—do not omit any of them.
- Check your server logs if you encounter issues. KubeJS errors will usually appear there.

