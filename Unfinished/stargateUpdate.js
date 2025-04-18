
const localStargates = {}
const globalStargates = {}
global.globalStargates = globalStargates
global.localStargates = localStargates



function valueInNestedArray(nestedArray, value) {
  return nestedArray.some(sub => sub.includes(value));
}
function parseSequence(str, delimiter = "-", expectedCount = 4) {
  const parts = str
    .split(delimiter)
    .map(s => s.trim())            // clean up whitespace
    .filter(s => s.length > 0);    // remove empty values

  if (parts.length !== expectedCount) {
    return null; // or throw an error, or return false
  }

  return parts.join(", ");
}
function parseRead(str, delimiter = ", ") {
  const parts = str
    .split(delimiter)
    .map(s => s.trim())            // clean up whitespace
    .filter(s => s.length > 0);    // remove empty values

  return parts.join("-");
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
    event.registerPeripheral("network_stargate", "the_network:domain_server_per")
  
      .method("registerGlobal", (container, direction, args, computer) => {
        let stargate = splitWithSequenceNumbers(args[0], "-",7) 
        let name = args[1]
        if (stargate == null){return {status:false, error:"Stargate Format Invaild"}}
        const linkid = getParentKeysOfSubkey(global.peripheralGroups, computer.getID())
        if (linkid.length == 0) {return {status: false, error:"Please Attach A Network Modem"}}
        if (globalStargates[name] == null) {return {status: false, error: "This Stargate Name Already exists"}}
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
        let stargate = splitWithSequenceNumbers(args[0], "-",7) 
        let name = args[1]
        if (stargate == null){return {status:false, error:"Stargate Format Invaild"}}
        const linkid = getParentKeysOfSubkey(global.peripheralGroups, computer.getID())
        if (linkid.length == 0) {return {status: false, error:"Please Attach A Network Modem"}}
        if (globalStargates[name] == null) {return {status: false, error: "This Stargate Name Already exists"}}
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
        
        return {status:true, value:{name: name, address: parseRead(globalStargates[name].address)}}
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
        const name = args[1]
        const linkid = getParentKeysOfSubkey(global.peripheralGroups, computer.getID())
        if (linkid.length == 0) {return {status: false, error:"Please Attach A Network Modem"}}
        if (pos == null) { return {status: false, error:"Connection Timeout"} }
        return {status:true, value:{name: name, address: parseRead(localStargates[pos][name].address)}}
      })
      .method("requestMyLocal", (container, direction, args, computer) => {
        const name = args[1]
        const linkid = getParentKeysOfSubkey(global.peripheralGroups, computer.getID())
        if (linkid.length == 0) {return {status: false, error:"Please Attach A Network Modem"}}
        return {status:true, value:{name: name, address: parseRead(localStargates[linkid][name].address)}}
      })
  })
  