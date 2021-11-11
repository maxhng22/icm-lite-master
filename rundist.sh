#!/usr/bin/expect -f

set  APPLICATION	"icm_lite_backend"
set  VERSION			"1.0.4"
set  DISTRIBUTION	"dist"

puts $APPLICATION-$VERSION
spawn mkdir ./$DISTRIBUTION
expect "%"
puts "CREATING VERSION FOLDER" 
spawn mkdir ./$DISTRIBUTION/$APPLICATION-$VERSION
expect "%"
# puts "CREATING CONFIG FOLDER" 
# spawn mkdir ./$DISTRIBUTION/$APPLICATION-$VERSION/conf
# expect "%"
# puts "COPYING app.conf"
# spawn cp conf/app.conf ./$DISTRIBUTION/$APPLICATION-$VERSION/conf/app.conf
# expect "%"
puts "PACKAGING APPLICATION (./$DISTRIBUTION/$APPLICATION-$VERSION/$APPLICATION-$VERSION)"

# refer to https://github.com/zeit/pkg for command information
# node6 will package for NodeJS version 6 environment
# x64 = 64-bit, x86 = 32-bit
# pkg -t node6-linux-x64,node6-win-x64 index.js -o ./$DISTRIBUTION/$APPLICATION-$VERSION/$APPLICATION-$VERSION
# pkg -t node10-linux-x64,node10-win-x64 index.js -o ./$DISTRIBUTION/$APPLICATION-$VERSION/$APPLICATION-$VERSION
# node_modules\\.bin\\pkg -t node10-linux-x64,node10-win-x64 index.js -o ./$DISTRIBUTION/$APPLICATION-$VERSION/$APPLICATION-$VERSION
# pkg -t node10-linux-x64,node10-win-x64 index.js -o ./$DISTRIBUTION/$APPLICATION-$VERSION/$APPLICATION-$VERSION
# pkg -t node10-mac-x64 app.js -o ./$DISTRIBUTION/$APPLICATION-$VERSION/$APPLICATION-$VERSION
spawn zsh 
expect "%"
send "pkg -t node10-linux-x64 app.js -o ./$DISTRIBUTION/$APPLICATION-$VERSION/$APPLICATION-$VERSION\r"
# send "pkg -t node10-mac-x64 app.js -o ./$DISTRIBUTION/$APPLICATION-$VERSION/$APPLICATION-$VERSION\r"
expect "%"
send "cd ./$DISTRIBUTION/$APPLICATION-$VERSION/\r"
expect "%"
send "zip $APPLICATION-$VERSION.zip $APPLICATION-$VERSION\r"
expect "%"
send "open .\r"
expect "%"
send "exit\r"
expect "%"


# spawn scp -P 33243 $DISTRIBUTION/$APPLICATION-$VERSION/$APPLICATION-$VERSION.zip vms@61.93.253.34:/home/vms/portal/icm_portal/
# # spawn scp -P 37609 $DISTRIBUTION/$APPLICATION-$VERSION/$APPLICATION-$VERSION.zip vms@223.119.21.54:/home/vms/portal/icm_portal/
# expect {
#   -re ".*password.*" {
#     exp_send "vmssvr@1\r"
#     # exp_send "CmiTcs@1\r"
#   }
#   -re "%" {
#     exp_send "unzip $APPLICATION-$VERSION.zip\r"
#   }
# }
# interact


# read -n 1 -s -p "Press any key to continue . . . "