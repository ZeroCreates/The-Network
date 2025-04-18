
const localStargates = {}
const globalStargates = {}
global.globalStargates = globalStargates
global.localStargates = localStargates



function valueInNestedArray(nestedArray, value) {
  return Object.values(nestedArray).includes(value);
}
function parseSequence(str, delimiter, expectedCount) {
  const parts = str.split(delimiter).filter(part => part.trim().length > 0);
  return parts.length > expectedCount;
}

function isOwned(name, owner){
  return globalStargates[name].owner == owner
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

ComputerCraftEvents.peripheral(event => {
    event.registerPeripheral("network_stargate", "the_network:network_stargate_per")
  
      .method("registerGlobal", (container, direction, args, computer) => {
        let stargate = args[0]
        let name = args[1]
        if (parseSequence(stargate,"-",7)){return {status:false, error:"Stargate Format Invaild"}}
        const linkid = getParentKeysOfSubkey(global.peripheralGroups, computer.getID())
        if (linkid.length == 0) {return {status: false, error:"Please Attach A Network Modem"}}
        if (globalStargates[name]) {return {status: false, error: "This Stargate Name Already exists"}}
        if (valueInNestedArray(globalStargates,stargate)) return {status:false, error:"This Stargate Already exists In the Global Network"}
        
        globalStargates[name] = {
          address: stargate,
          owner: linkid,
        }
        
        return  {status: true}
      })
      
      .method("unregisterGlobal", (container, direction, args, computer) => {
        let name = args[0]
        const linkid = getParentKeysOfSubkey(global.peripheralGroups, computer.getID())
        if (linkid.length == 0) {return {status: false, error:"Please Attach A Network Modem"}}
        if (globalStargates[name] == null) { return {status: false , error: "This Name Does Not Exist"}}
        if (isOwned(name,linkid)){ return {status:false , error: "You Do not Own This Stargate"}}
        delete globalStargates[name] 
        return {status:true}
      })

      .method("registerLocal", (container, direction, args, computer) => {
        let stargate = args[0]
        let name = args[1]
        if (parseSequence(stargate,"-",7)){return {status:false, error:"Stargate Format Invaild"}}
        const linkid = getParentKeysOfSubkey(global.peripheralGroups, computer.getID())
        if (linkid.length == 0) {return {status: false, error:"Please Attach A Network Modem"}}
        if (globalStargates[name]) {return {status: false, error: "This Stargate Name Already exists"}}
        if (valueInNestedArray(globalStargates,stargate)) return {status:false, error:"This Stargate Already exists In the Global Network"}
        if (localStargates[linkid] == null) { localStargates[linkid]= {}}
        localStargates[linkid][name] = {
          address: stargate,
          owner: linkid,
        }
        return  {status: true}
      })
      .method("unregisterLocal", (container, direction, args, computer) => {
        let name = args[0]
        const linkid = getParentKeysOfSubkey(global.peripheralGroups, computer.getID())
        if (linkid.length == 0) {return {status: false, error:"Please Attach A Network Modem"}}
        if (globalStargates[name] == null) { return {status: false , error: "This Name Does Not Exist"}}
        delete localStargates[linkid][name]
        return {status:true}
      })

      .method("requestGlobal", (container, direction, args, computer) => {
        let name = args[0]
        const linkid = getParentKeysOfSubkey(global.peripheralGroups, computer.getID())
        if (linkid.length == 0) {return {status: false, error:"Please Attach A Network Modem"}}
        if (globalStargates[name] == null) { return {status: false , error: "This Name Does Not Exist"}}
        
        return {status:true, value:{name: name, address:  globalStargates[name].address}}
      })
      .method("globalList", (container, direction, args, computer) => {
        const linkid = getParentKeysOfSubkey(global.peripheralGroups, computer.getID())
        if (linkid.length == 0) {return {status: false, error:"Please Attach A Network Modem"}}
        return {status:true, value:Object.keys(globalStargates)}
      })
      .method("localList", (container, direction, args, computer) => {
        const linkid = getParentKeysOfSubkey(global.peripheralGroups, computer.getID())
        if (linkid.length == 0) {return {status: false, error:"Please Attach A Network Modem"}}
        return {status:true, value:Object.keys(localStargates[linkid])}
      })
      .method("requestLocal", (container, direction, args, computer) => {
        const pos = getKeyFromValue(wanAssignments, args[0])
        const name = args[0]
        const linkid = getParentKeysOfSubkey(global.peripheralGroups, computer.getID())
        if (linkid.length == 0) {return {status: false, error:"Please Attach A Network Modem"}}
        if (pos == null) { return {status: false, error:"Connection Timeout"} }
        return {status:true, value:{name: name, address:  localStargates[linkid][name].address}}
      })
      .method("requestMyLocal", (container, direction, args, computer) => {
        const name = args[0]
        const linkid = getParentKeysOfSubkey(global.peripheralGroups, computer.getID())
        if (linkid.length == 0) {return {status: false, error:"Please Attach A Network Modem"}}
        if (localStargates[linkid][name] == null) {return {status: false, error:"This Entry Does not Exist"}}
        return {status:true, value:{name: name, address: localStargates[linkid][name].address}}
      })
  })
  