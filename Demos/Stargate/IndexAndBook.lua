-- CONFIGURATION --
local useMonitor = true                  -- Use external monitor or terminal
local columnWidth = 25                   -- Width of each column in the UI
local saveLocals = true                  -- Whether to save local destinations
local localFile = "local_gates.txt"      -- File to store local gate data

-- PERIPHERALS SETUP --
local monitor = useMonitor and peripheral.find("monitor") or term
local gate = peripheral.find("advanced_crystal_interface")
local network = peripheral.find("network_modem")
local sgnet = peripheral.find("network_stargate")

-- INITIALIZATION --
if not gate then error("Stargate not found!") end
local ips = network.getIp("wan")
print("My Wan IP is ", ips.value)

-- UTILITIES --

-- Split string by delimiter
function split(input, delimiter)
  local result = {}
  for part in string.gmatch(input, "([^" .. delimiter .. "]+)") do
    table.insert(result, part)
  end
  return result
end

-- Safely call a function, checking `status`
local function safeCall(fn, ...)
  local ok, result = pcall(fn, ...)
  if not ok or not result or not result.status then return nil end
  return result.value
end

-- Check if value exists in array
local function contains(array, value)
  for _, v in ipairs(array) do
    if v == value then return true end
  end
  return false
end

-- Load saved local destinations and register with Stargate
local function loadAndRegisterSavedLocals()
  if not fs.exists(localFile) then return end
  local f = fs.open(localFile, "r")
  while true do
    local line = f.readLine()
    if not line then break end
    local ok, data = pcall(textutils.unserializeJSON, line)
    if ok and data and data.name and data.address then
      pcall(function()
        if sgnet.registerLocal then
          sgnet.registerLocal(data.address,data.name)
        end
      end)
    end
  end
  f.close()
end
loadAndRegisterSavedLocals()

-- GATE DIALING --

local currentsymbol = ""
local address = {}
local encoding = 0

-- Dial address split by `-`
function dial(addressraw)
  address = split(addressraw, "-")
  encoding = 1
  for _, symbol in pairs(address) do
    gate.engageSymbol(tonumber(symbol))
    sleep(1)
  end
  gate.engageSymbol(0)
end

-- Fetch and optionally save gate destinations
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

  if saveLocals and #fileData > 0 then
    local f = fs.open(localFile, "w")
    for _, line in ipairs(fileData) do
      f.writeLine(line)
    end
    f.close()
  end

  return entries
end

-- UI SETUP --

monitor.setTextScale(0.5)
monitor.setBackgroundColor(colors.black)
monitor.setTextColor(colors.white)
monitor.clear()

local clickableEntries = {}
local screenWidth, screenHeight = monitor.getSize()

-- Draw Monitor UI
local function draw(global, localList, isGateOpen)
  monitor.clear()
  clickableEntries = {}

  monitor.setCursorPos(1, 1)
  monitor.setTextColor(colors.yellow)
  monitor.write(string.format("%-"..columnWidth.."s | %s", "Global", "Local"))
  monitor.setTextColor(colors.white)

  local maxLines = math.max(#global, #localList)
  for i = 1, maxLines do
    local y = i + 1
    local g = global[i]
    local l = localList[i]

    if g then
      monitor.setCursorPos(1, y)
      monitor.write(g.name)
      table.insert(clickableEntries, { x1 = 1, y = y, x2 = #g.name, name = g.name, address = g.address })
    end

    if l then
      local x = columnWidth + 4
      monitor.setCursorPos(x, y)
      monitor.write(l.name)
      table.insert(clickableEntries, { x1 = x, y = y, x2 = x + #l.name - 1, name = l.name, address = l.address })
    end
  end

  -- Status Line
  monitor.setCursorPos(1, screenHeight - 1)
  
  local gatestatus = ""
  if not isGateOpen then
    if currentsymbol == "" then
      if encoding == 2 then
        monitor.setTextColor(colors.purple)
        gatestatus = "Status: Connecting"
      else
        monitor.setTextColor(colors.gray)
        gatestatus = "Status: Idle"
      end
    else
      monitor.setTextColor(colors.blue)
      gatestatus = encoding == 0 and "Status: Powering up" or "Status: Encoding " .. currentsymbol
    end
  else
    
    monitor.setTextColor(colors.green)
    gatestatus = "Status: Gate Open"
    encoding = 0
    address = {}
  end
  monitor.write(gatestatus)
  monitor.setTextColor(colors.white)

  -- Disconnect Button
  if isGateOpen then
    monitor.setCursorPos(screenWidth - 14, screenHeight)
    monitor.setBackgroundColor(colors.red)
    monitor.setTextColor(colors.white)
    monitor.write(" Disconnect ")
    table.insert(clickableEntries, { x1 = screenWidth - 14, y = screenHeight, x2 = screenWidth - 2, type = "disconnect" })
    monitor.setBackgroundColor(colors.black)
    monitor.setTextColor(colors.white)
  end
end

-- HANDLE MONITOR TOUCH INPUT --

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

local function monitorTouchLoop()
  while true do
    local event, side, x, y = os.pullEvent("monitor_touch")
    if handleTouch(x, y) then sleep(0.1) end
  end
end

-- MONITOR SYMBOL TRACKING --

local function trackSymbol()
  while true do
    if not address[1] then
      currentsymbol = ""
    else
      local sym = address[tonumber(gate.getChevronsEngaged()) + 1]
      currentsymbol = sym or ""
      if sym then encoding = 2 end
    end
    sleep(0.1)
  end
end

-- USER COMMAND INPUT LOOP --

local function commandInput()
  while true do
    local input = read()
    input = string.lower(input)

    if input == "register(local)" or input == "register(global)" then
      local scope = input:match("%((.-)%)")
      print(scope:sub(1,1):upper() .. scope:sub(2) .. " Register Active")
      write("-- Enter name > ")
      local name = read()
      write("-- Enter Address (split by '-') > ")
      local addr = read()
      local reply = sgnet["register" .. scope:sub(1,1):upper() .. scope:sub(2)](addr, name)
      print(reply.status and "Set To " .. scope or "Error: " .. tostring(reply.error))

    elseif input == "unregister(local)" or input == "unregister(global)" then
      local scope = input:match("%((.-)%)")
      print(scope:sub(1,1):upper() .. scope:sub(2) .. " Unregister Active")
      write("-- Enter name > ")
      local name = read()
      local reply = sgnet["unregister" .. scope:sub(1,1):upper() .. scope:sub(2)](name)
      print(reply.status and "Removed From " .. scope or "Error: " .. tostring(reply.error))
    elseif input == "upload()" then
      local location = disk.getMountPath(peripheral.getName(peripheral.find("drive")))
      if location then
        local file = fs.open(fs.combine(location, "loadFile.txt"), "r")
        while true do
          local line = file.readLine()
          if not line then break end
          local data = textutils.unserialise(line)
          if data and data.name and data.address then
            local reply = sgnet.registerLocal(data.address, data.name)
            print(reply.status and "Synced: " .. data.name or "Error: " .. tostring(reply.error))
          end
        end
        print("List Finished")
      end

    elseif input == "download()" then
      local names = {}
      print("Enter names to Download. Type 'end' to finish.")
      while true do
        local name = read()
        if string.lower(name) == "end" then break end
        table.insert(names, name)
      end

      local location = disk.getMountPath(peripheral.getName(peripheral.find("drive")))
      if location then
        local localList = fetchDestinations(sgnet.localList, sgnet.requestMyLocal, true)
        local file = fs.open(fs.combine(location, "loadFile.txt"), "w")
        for _, line in ipairs(localList) do
          if contains(names, line.name) then
            print("Saved ", line.name)
            file.writeLine(textutils.serialise(line,{ compact = true }))
          end
        end
        file.close()
      end
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
    sleep(0.1)
  end
end

-- RUN PARALLEL TASKS --
parallel.waitForAll(main, monitorTouchLoop, trackSymbol, commandInput)
