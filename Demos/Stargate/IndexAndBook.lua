-- CONFIG --
local useMonitor = true
local columnWidth = 25

-- SETUP --
local monitor = useMonitor and peripheral.find("monitor") or term
local gate = peripheral.find("advanced_crystal_interface")
local network = peripheral.find("network_modem")
local sgnet = peripheral.find("network_stargate")
local ips = network.getIp("wan")
local saveLocals = true
local localFile = "local_gates.txt"
local function loadAndRegisterSavedLocals()
    if not fs.exists(localFile) then return end
    local f = fs.open(localFile, "r")
    while true do
      local line = f.readLine()
      if not line then break end
      local ok, data = pcall(textutils.unserializeJSON, line)
      if ok and data and data.name and data.address then
        pcall(function()
          if gate.registerLocal then
            gate.registerLocal(data.name, data.address)
          end
        end)
      end
    end
    f.close()
  end
loadAndRegisterSavedLocals()
print("My Wan Ip is ",ips.value)
function split(input, delimiter)
    local result = {}
    for part in string.gmatch(input, "([^" .. delimiter .. "]+)") do
        table.insert(result, part)
    end
    return result
end
local currentsymbol = ""
local address = {}
local encoding = 0
function dial(addressraw)
    address = split(addressraw, "-")
    encoding = 1
    for _, symbol in pairs(address) do
        gate.engageSymbol(tonumber(symbol))
        sleep(1)
    end
    gate.engageSymbol(tonumber("0"))
end
if not gate then error("Stargate not found!") end
monitor.setTextScale(0.5)
monitor.setBackgroundColor(colors.black)
monitor.setTextColor(colors.white)
monitor.clear()

local clickableEntries = {}
local screenWidth, screenHeight = monitor.getSize()

-- FETCH FUNCTIONS --
local function safeCall(fn, ...)
  local ok, result = pcall(fn, ...)
  if not ok or not result or not result.status then return nil end
  return result.value
end

local function fetchDestinations(listFn, requestFn, saveLocals)
    local entries = {}
    local names = safeCall(listFn)
    if not names then return entries end
  
    local fileData = {}
  
    for _, name in ipairs(names) do
      local res = safeCall(requestFn, name)
      if res and res.address then
        table.insert(entries, { name = name, address = res.address })
        if saveLocals then
          table.insert(fileData, textutils.serializeJSON({ name = name, address = res.address }))
        end
      end
    end
  
    -- Save local list if needed
    if saveLocals and #fileData > 0 then
      local f = fs.open(localFile, "w")
      for _, line in ipairs(fileData) do
        f.writeLine(line)
      end
      f.close()
    end
  
    return entries
  end

-- DRAW UI --
local function draw(global, localList, isGateOpen)
  monitor.clear()
  clickableEntries = {}

  -- Header
  monitor.setCursorPos(1, 1)
  monitor.setTextColor(colors.yellow)
  monitor.write(string.format("%-"..columnWidth.."s | %s", "Global", "Local"))
  monitor.setTextColor(colors.white)

  -- List
  local maxLines = math.max(#global, #localList)
  for i = 1, maxLines do
    local y = i + 1
    local g = global[i]
    local l = localList[i]

    if g then
      monitor.setCursorPos(1, y)
      monitor.write(g.name)
      table.insert(clickableEntries, {
        x1 = 1, y = y, x2 = #g.name, name = g.name, address = g.address
      })
    end

    if l then
      local x = columnWidth + 4
      monitor.setCursorPos(x, y)
      monitor.write(l.name)
      table.insert(clickableEntries, {
        x1 = x, y = y, x2 = x + #l.name - 1, name = l.name, address = l.address
      })
    end
  end

  -- Gate Status
  monitor.setCursorPos(1, screenHeight - 1)
  monitor.setTextColor(isGateOpen and colors.lime or colors.gray)
  local gatestatus = ""
  if isGateOpen == false then
    if currentsymbol == ""  then
        if encoding == 2 then
            
            monitor.setTextColor(colors.purple)
            gatestatus = "Status: Connecting"
        else
            monitor.setTextColor(colors.gray)
            gatestatus = "Status: Idle"
        end
    else
        if encoding == 0 then
            gatestatus = "Status: Powering up"
        else
            gatestatus = "Status: Encodeing "..currentsymbol
        end
    end
    else
        monitor.setTextColor(colors.lime)
        gatestatus ="Status: Gate Open"
        encoding = 0
        address = {}
    end
  monitor.write(gatestatus)
  monitor.setTextColor(colors.white)

  -- Disconnect Button (only if gate is open)
  if isGateOpen then
    monitor.setCursorPos(screenWidth - 14, screenHeight)
    monitor.setBackgroundColor(colors.red)
    monitor.setTextColor(colors.white)
    monitor.write(" Disconnect ")
    table.insert(clickableEntries, {
      x1 = screenWidth - 14,
      y = screenHeight,
      x2 = screenWidth - 2,
      type = "disconnect"
    })
    monitor.setBackgroundColor(colors.black)
    monitor.setTextColor(colors.white)
  end
end

-- TOUCH HANDLER --
local function handleTouch(x, y)
  for _, entry in ipairs(clickableEntries) do
    if y == entry.y and x >= entry.x1 and x <= entry.x2 then
      if entry.type == "disconnect" then
        gate.disconnectStargate()
        return true
      elseif entry.address then
        dial(entry.address)
        return true
      end
    end
  end
  return false
end
local function input()
    while true do
        local event, side, x, y = os.pullEvent("monitor_touch")
        if handleTouch(x, y) then
        sleep(.1) -- give the gate time to update
        end
    end
    
end
-- MAIN LOOP --
local function main()
  while true do
    local global = fetchDestinations(sgnet.globalList, sgnet.requestGlobal)
    local localList = fetchDestinations(sgnet.localList, sgnet.requestMyLocal, true)

    local isOpen = gate.isWormholeOpen and gate.isWormholeOpen()
    draw(global, localList, isOpen)
    sleep(.1)
  end
end

local function symbol()
    while true do
        if address[1] == nil then
            currentsymbol = ""
        else
            local symboll = address[tonumber(gate.getChevronsEngaged()) +1]
            if symboll == nil then
                currentsymbol = ""
            else
                currentsymbol = symboll
                encoding = 2
            end
        end
        sleep(.1)
    end    
end
local function Input()
    while true do
        local input = read()
        if string.lower(input) == "register(local)" then
            print("Local Register Active")
            write("-- Enter name > ")
            local name = read()
            print("")
            write("-- Enter Address (split By '-' but not before or after) > ")
            local address = read()
            print("Registering")
            local reply = sgnet.registerLocal(address, name)
            if reply.status == true then
                print("Set To Local")
            else
                print("Error: ", reply.error)
            end
        elseif string.lower(input) == "register(global)" then
            print("Global Register Active")
            write("-- Enter name > ")
            local name = read()
            print("")
            write("-- Enter Address (split By '-' but not before or after) > ")
            local address = read()
            print("Registering")
            local reply = sgnet.registerGlobal(address, name)
            if reply.status == true then
                print("Set To Global")
            else
                print("Error: ", reply.error)
            end
        elseif  string.lower(input) == "unregister(global)" then
            print("Global Unregister Active")
            write("-- Enter name > ")
            local name = read()
            print("Registering")
            local reply = sgnet.unregisterGlobal(name)
            if reply.status == true then
                print("Removed From Global")
            else
                print("Error: ", reply.error)
            end
        elseif  string.lower(input) == "unregister(local)" then
            print("Local Unregister Active")
            write("-- Enter name > ")
            local name = read()
            print("Registering")
            local reply = sgnet.unregisterLocal(name)
            if reply.status == true then
                print("Removed From Local")
            else
                print("Error: ", reply.error)
            end
        end
    end
end
parallel.waitForAll(main,input,symbol,Input)