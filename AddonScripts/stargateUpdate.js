
const invites = {}


function valueInNestedArray(nestedArray, value) {
  return Object.values(nestedArray).includes(value);
}
function parseSequence(str, delimiter, expectedCount) {
  const parts = str.split(delimiter).filter(part => part.trim().length > 0);
  return parts.length > expectedCount;
}

function isOwned(name, owner){
  return global.globalStargates[name].owner == owner
}
function getParentKeysOfSubkey(obj, targetSubKey) {
  const keys = [];

  for (const [key, subObj] of Object.entries(obj)) {
    if (targetSubKey in subObj) {
      keys.push(key);
    }
  }

  return keys;
}
function getKeyFromValue(map, value) {
  for (let [key, val] of map) {
    if (val === value) {
      return key;  // Returns the key when the value matches
    }
  }
  return null;  // Returns null if no matching value is found
}
function findKeyByValue(targetValue) {
  for (const key in global.syncedProto) {
    const value = global.syncedProto[key];
    if (Array.isArray(value) && value.includes(targetValue)) {
      return key; // Found it!
    }
  }
  return null; // Not found
}
function combindteam(linkid){
  let key = findKeyByValue(linkid)
  if (key != null) {
    return Object.keys(global.localStargates[linkid]).concat(Object.keys(global.syncedStargates[key]))
  }
}
ComputerCraftEvents.peripheral(event => {
    event.registerPeripheral("network_stargate", "the_network:network_stargate_per")
  
      .method("registerGlobal", (container, direction, args, computer) => {
        let stargate = args[0]
        let name = args[1]
        if (parseSequence(stargate,"-",7)){return {status:false, error:"Stargate Format Invaild"}}
        const linkid = getParentKeysOfSubkey(global.peripheralGroups, computer.getID())
        if (linkid.length == 0) {return {status: false, error:"Please Attach A Network Modem"}}
        if (global.globalStargates[name]) {return {status: false, error: "This Stargate Name Already exists"}}
        if (valueInNestedArray(global.globalStargates,stargate)) return {status:false, error:"This Stargate Already exists In the Global Network"}
        
        global.globalStargates[name] = {
          address: stargate,
          owner: linkid,
        }
        console.info("[The Network (Stargate Script)] Registered Global Stargate " + name + " With the Address " + stargate + " As Owner " + linkid) 
        return  {status: true}
      })
      
      .method("unregisterGlobal", (container, direction, args, computer) => {
        let name = args[0]
        const linkid = getParentKeysOfSubkey(global.peripheralGroups, computer.getID())
        if (linkid.length == 0) {return {status: false, error:"Please Attach A Network Modem"}}
        if (global.globalStargates[name] == null) { return {status: false , error: "This Name Does Not Exist"}}
        if (isOwned(name,linkid)){ return {status:false , error: "You Do not Own This Stargate"}}
        delete global.globalStargates[name] 
        console.info("[The Network (Stargate Script)] Unregistered Global Stargate " + name + " As Owner " + linkid) 
        return {status:true}
      })

      .method("registerLocal", (container, direction, args, computer) => {
        let stargate = args[0]
        let name = args[1]
        if (parseSequence(stargate,"-",7)){return {status:false, error:"Stargate Format Invaild"}}
        const linkid = getParentKeysOfSubkey(global.peripheralGroups, computer.getID())
        if (linkid.length == 0) {return {status: false, error:"Please Attach A Network Modem"}}
        if (global.globalStargates[name]) {return {status: false, error: "This Stargate Name Already exists"}}
        if (valueInNestedArray(global.globalStargates,stargate)) return {status:false, error:"This Stargate Already exists In the Global Network"}
        if (global.localStargates[linkid] == null) { global.localStargates[linkid]= {}}
        global.localStargates[linkid][name] = {
          address: stargate,
          owner: linkid,
        }
        console.info("[The Network (Stargate Script)] Registered Local Stargate " + name + " With the Address " + stargate + " For " + linkid) 
        return  {status: true}
      })
      .method("unregisterLocal", (container, direction, args, computer) => {
        let name = args[0]
        const linkid = getParentKeysOfSubkey(global.peripheralGroups, computer.getID())
        if (linkid.length == 0) {return {status: false, error:"Please Attach A Network Modem"}}
        if (global.localStargates[linkid][name] == null) { return {status: false , error: "This Name Does Not Exist"}}
        delete global.localStargates[linkid][name]
        if (global.syncedStargates[findKeyByValue(linkid)][name]){delete global.syncedStargates[findKeyByValue(linkid)][name]}
        console.info("[The Network (Stargate Script)] Unregistered Local Stargate " + name + " For " + linkid) 
        return {status:true}
      })

      .method("requestGlobal", (container, direction, args, computer) => {
        let name = args[0]
        const linkid = getParentKeysOfSubkey(global.peripheralGroups, computer.getID())
        if (linkid.length == 0) {return {status: false, error:"Please Attach A Network Modem"}}
        if (global.globalStargates[name] == null) { return {status: false , error: "This Name Does Not Exist"}}
        
        return {status:true, value:{name: name, address:  global.globalStargates[name].address}}
      })
      .method("globalList", (container, direction, args, computer) => {
        const linkid = getParentKeysOfSubkey(global.peripheralGroups, computer.getID())
        if (linkid.length == 0) {return {status: false, error:"Please Attach A Network Modem"}}
        return {status:true, value:Object.keys(global.globalStargates)}
      })
      .method("localList", (container, direction, args, computer) => {
        const linkid = getParentKeysOfSubkey(global.peripheralGroups, computer.getID())
        if (linkid.length == 0) {return {status: false, error:"Please Attach A Network Modem"}}
        return {status:true, value:Object.keys(global.localStargates[linkid])}
      })
      .method("requestLocal", (container, direction, args, computer) => {
        const pos = getKeyFromValue(wanAssignments, args[0])
        const name = args[0]
        const linkid = getParentKeysOfSubkey(global.peripheralGroups, computer.getID())
        if (linkid.length == 0) {return {status: false, error:"Please Attach A Network Modem"}}
        if (pos == null) { return {status: false, error:"Connection Timeout"} }
        return {status:true, value:{name: name, address:  global.localStargates[linkid][name].address}}
      })
      .method("requestMyLocal", (container, direction, args, computer) => {
        const name = args[0]
        const linkid = getParentKeysOfSubkey(global.peripheralGroups, computer.getID())
        if (linkid.length == 0) {return {status: false, error:"Please Attach A Network Modem"}}
        if (global.syncedStargates[findKeyByValue(linkid)]){
          if (global.syncedStargates[findKeyByValue(linkid)][name]){
            return {status:true, value:{name: name, address: global.syncedStargates[findKeyByValue(linkid)][name].address}}
          }
        }
        if (global.localStargates[linkid][name] == null ) {
          return {status: false, error:"This Entry Does not Exist"}
        }else {
          return {status:true, value:{name: name, address: global.localStargates[linkid][name].address}}
        }return {status:false, error:"Complete Fail"}
      })
      .method("teamIP", (container, direction, args, computer) => {
        const method = args[0]
        const linkid = getParentKeysOfSubkey(global.peripheralGroups, computer.getID())
        if (linkid.length == 0) {return {status: false, error:"Please Attach A Network Modem"}}
        if (method == "create") {
          global.syncedStargates[linkid] = {}
          global.syncedProto[linkid] = []
          return {status:true}
        }else if (method == "invite") {
          const pos = getKeyFromValue(wanAssignments, args[1])
          invites[pos] = {
            inviter: linkid,
            ip: wanAssignments[linkid]
          }
          return {status:true}
        }else if (method == "accept"){
          if (invites[linkid == null]) { return {status:false, error:"No Invites"} }
          if (findKeyByValue(linkid) != null) { return {status:false, error:"Already A part of a team"} }
          global.syncedProto[invites[linkid].inviter].push(linkid)
          return {status:true, info:{ip: invites[linkid].ip}}
        }else if (method == "sync"){
          if (findKeyByValue(linkid) == null) {return {status:false, error:"You Have No Team"}}
          Object.assign(global.syncedStargates[findKeyByValue(linkid)], global.localStargates[linkid]);
          return {status:true}
        }else {
          return {status:false ,error: "Invalid Input", vaild: ["create","invite","accept","sync"]}
        }
      })
  })
  