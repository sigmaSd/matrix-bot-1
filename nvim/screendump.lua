--credits: i14
--https://gist.github.com/ii14/a9efb9566acc2217a146bce39723c28b

local fn = vim.fn

vim.cmd('redraw')

local rows = vim.o.lines
local cols = vim.o.columns

local lines = {}
for row = 1, rows do
  local line = {}
  for col = 1, cols do
    line[#line + 1] = fn.screenstring(row, col)
  end
  lines[row] = table.concat(line)
end

for _, line in ipairs(lines) do
  print(line)
end

-- nvim --headless -c 'so screendump.lua' -c 'qa!'
