-- credits for the origina idea
-- https://gist.github.com/ii14/a9efb9566acc2217a146bce39723c28b

vim.cmd('redraw')

local lines = {}

-- Iterate over all open buffers
for _, bufnr in ipairs(vim.api.nvim_list_bufs()) do
  -- Get the lines from the buffer
  local buffer_lines = vim.api.nvim_buf_get_lines(bufnr, 0, -1, false)

  -- Concatenate the lines into a single string
  local buffer_text = table.concat(buffer_lines, '\n')

  -- Save the buffer text in the lines dictionary
  lines[bufnr] = buffer_text
end

for _, line in ipairs(lines) do
  print(line)
end

-- nvim --headless -c 'so screendump.lua' -c 'qa!'
