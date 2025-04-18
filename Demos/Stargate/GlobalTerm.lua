local sg = peripheral.find("advanced_crystal_interface")
local netsg = peripheral.find("network_stargate")
local network = peripheral.find("network_modem")

local addressraw = sg.getLocalAddress()

local address = table.concat(addressraw, "-")
print("Found Address :", address)
local name = "Spawn"

local networkip = network.getIp()
if networkip.status == true then
    local stat = netsg.registerGlobal(address,name)
    if stat.status == true then
        print("Sent To Global")
    else
        print("Error: ", stat.error)
    end
else
    print("Error: ", networkip.error)
end

