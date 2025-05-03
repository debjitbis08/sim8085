---
title: Instruction Set Summary
description: 8080/85 CPU Instructions in Operation Code Sequence
---

The following is a summary of the instruction set:

8080/85 CPU Instructions in Operation Code Sequence

<div class="instruction-table">
  <div class="column">
  <div class="instruction">
    <span class="opcode">00</span>
    <span class="mnemonic">
      <span class="operation">NOP</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">01</span>
    <span class="mnemonic">
      <span class="operation">LXI</span>
      <span class="operands">B, D16</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">02</span>
    <span class="mnemonic">
      <span class="operation">STAX</span>
      <span class="operands">B</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">03</span>
    <span class="mnemonic">
      <span class="operation">INX</span>
      <span class="operands">B</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">04</span>
    <span class="mnemonic">
      <span class="operation">INR</span>
      <span class="operands">B</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">05</span>
    <span class="mnemonic">
      <span class="operation">DCR</span>
      <span class="operands">B</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">06</span>
    <span class="mnemonic">
      <span class="operation">MVI</span>
      <span class="operands">B, D8</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">07</span>
    <span class="mnemonic">
      <span class="operation">RLC</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">08</span>
    <span class="mnemonic">
      <span class="operation">--</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">09</span>
    <span class="mnemonic">
      <span class="operation">DAD</span>
      <span class="operands">B</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">0A</span>
    <span class="mnemonic">
      <span class="operation">LDAX</span>
      <span class="operands">B</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">0B</span>
    <span class="mnemonic">
      <span class="operation">DCX</span>
      <span class="operands">B</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">0C</span>
    <span class="mnemonic">
      <span class="operation">INR</span>
      <span class="operands">C</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">0D</span>
    <span class="mnemonic">
      <span class="operation">DCR</span>
      <span class="operands">C</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">0E</span>
    <span class="mnemonic">
      <span class="operation">MVI</span>
      <span class="operands">C, D8</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">0F</span>
    <span class="mnemonic">
      <span class="operation">RRC</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">10</span>
    <span class="mnemonic">
      <span class="operation">--</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">11</span>
    <span class="mnemonic">
      <span class="operation">LXI</span>
      <span class="operands">D, D16</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">12</span>
    <span class="mnemonic">
      <span class="operation">STAX</span>
      <span class="operands">D</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">13</span>
    <span class="mnemonic">
      <span class="operation">INX</span>
      <span class="operands">D</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">14</span>
    <span class="mnemonic">
      <span class="operation">INR</span>
      <span class="operands">D</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">15</span>
    <span class="mnemonic">
      <span class="operation">DCR</span>
      <span class="operands">D</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">16</span>
    <span class="mnemonic">
      <span class="operation">MVI</span>
      <span class="operands">D, D8</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">17</span>
    <span class="mnemonic">
      <span class="operation">RAL</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">18</span>
    <span class="mnemonic">
      <span class="operation">--</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">19</span>
    <span class="mnemonic">
      <span class="operation">DAD</span>
      <span class="operands">D</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">1A</span>
    <span class="mnemonic">
      <span class="operation">LDAX</span>
      <span class="operands">D</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">1B</span>
    <span class="mnemonic">
      <span class="operation">DCX</span>
      <span class="operands">D</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">1C</span>
    <span class="mnemonic">
      <span class="operation">INR</span>
      <span class="operands">E</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">1D</span>
    <span class="mnemonic">
      <span class="operation">DCR</span>
      <span class="operands">E</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">1E</span>
    <span class="mnemonic">
      <span class="operation">MVI</span>
      <span class="operands">E, D8</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">1F</span>
    <span class="mnemonic">
      <span class="operation">RAR</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">20</span>
    <span class="mnemonic">
      <span class="operation">RIM</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">21</span>
    <span class="mnemonic">
      <span class="operation">LXI</span>
      <span class="operands">H, D16</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">22</span>
    <span class="mnemonic">
      <span class="operation">SHLD</span>
      <span class="operands">Adr</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">23</span>
    <span class="mnemonic">
      <span class="operation">INX</span>
      <span class="operands">H</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">24</span>
    <span class="mnemonic">
      <span class="operation">INR</span>
      <span class="operands">H</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">25</span>
    <span class="mnemonic">
      <span class="operation">DCR</span>
      <span class="operands">H</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">26</span>
    <span class="mnemonic">
      <span class="operation">MVI</span>
      <span class="operands">H, D8</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">27</span>
    <span class="mnemonic">
      <span class="operation">DAA</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">28</span>
    <span class="mnemonic">
      <span class="operation">--</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">29</span>
    <span class="mnemonic">
      <span class="operation">DAD</span>
      <span class="operands">H</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">2A</span>
    <span class="mnemonic">
      <span class="operation">LHLD</span>
      <span class="operands">Adr</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">2B</span>
    <span class="mnemonic">
      <span class="operation">DCX</span>
      <span class="operands">H</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">2C</span>
    <span class="mnemonic">
      <span class="operation">INR</span>
      <span class="operands">L</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">2D</span>
    <span class="mnemonic">
      <span class="operation">DCR</span>
      <span class="operands">L</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">2E</span>
    <span class="mnemonic">
      <span class="operation">MVI</span>
      <span class="operands">L, D8</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">2F</span>
    <span class="mnemonic">
      <span class="operation">CMA</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">30</span>
    <span class="mnemonic">
      <span class="operation">SIM</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">31</span>
    <span class="mnemonic">
      <span class="operation">LXI</span>
      <span class="operands">SP, D16</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">32</span>
    <span class="mnemonic">
      <span class="operation">STA</span>
      <span class="operands">Adr</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">33</span>
    <span class="mnemonic">
      <span class="operation">INX</span>
      <span class="operands">SP</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">34</span>
    <span class="mnemonic">
      <span class="operation">INR</span>
      <span class="operands">M</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">35</span>
    <span class="mnemonic">
      <span class="operation">DCR</span>
      <span class="operands">M</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">36</span>
    <span class="mnemonic">
      <span class="operation">MVI</span>
      <span class="operands">M, D8</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">37</span>
    <span class="mnemonic">
      <span class="operation">STC</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">38</span>
    <span class="mnemonic">
      <span class="operation">--</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">39</span>
    <span class="mnemonic">
      <span class="operation">DAD</span>
      <span class="operands">SP</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">3A</span>
    <span class="mnemonic">
      <span class="operation">LDA</span>
      <span class="operands">Adr</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">3B</span>
    <span class="mnemonic">
      <span class="operation">DCX</span>
      <span class="operands">SP</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">3C</span>
    <span class="mnemonic">
      <span class="operation">INR</span>
      <span class="operands">A</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">3D</span>
    <span class="mnemonic">
      <span class="operation">DCR</span>
      <span class="operands">A</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">3E</span>
    <span class="mnemonic">
      <span class="operation">MVI</span>
      <span class="operands">A, D8</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">3F</span>
    <span class="mnemonic">
      <span class="operation">CMC</span>
    </span>
  </div>
  </div>

  <div class="column">
  <div class="instruction">
    <span class="opcode">40</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">B, B</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">41</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">B, C</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">42</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">B, D</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">43</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">B, E</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">44</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">B, H</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">45</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">B, L</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">46</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">B, M</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">47</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">B, A</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">48</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">C, B</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">49</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">C, C</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">4A</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">C, D</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">4B</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">C, E</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">4C</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">C, H</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">4D</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">C, L</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">4E</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">C, M</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">4F</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">C, A</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">50</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">D, B</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">51</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">D, C</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">52</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">D, D</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">53</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">D, E</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">54</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">D, H</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">55</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">D, L</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">56</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">D, M</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">57</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">D, A</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">58</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">E, B</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">59</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">E, C</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">5A</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">E, D</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">5B</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">E, E</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">5C</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">E, H</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">5D</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">E, L</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">5E</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">E, M</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">5F</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">E, A</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">60</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">H, B</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">61</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">H, C</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">62</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">H, D</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">63</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">H, E</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">64</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">H, H</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">65</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">H, L</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">66</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">H, M</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">67</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">H, A</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">68</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">L, B</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">69</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">L, C</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">6A</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">L, D</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">6B</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">L, E</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">6C</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">L, H</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">6D</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">L, L</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">6E</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">L, M</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">6F</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">L, A</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">70</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">M, B</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">71</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">M, C</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">72</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">M, D</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">73</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">M, E</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">74</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">M, H</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">75</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">M, L</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">76</span>
    <span class="mnemonic">
      <span class="operation">HLT</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">77</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">M, A</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">78</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">A, B</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">79</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">A, C</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">7A</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">A, D</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">7B</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">A, E</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">7C</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">A, H</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">7D</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">A, L</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">7E</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">A, M</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">7F</span>
    <span class="mnemonic">
      <span class="operation">MOV</span>
      <span class="operands">A, A</span>
    </span>
  </div>
  </div>

  <div class="column">
  <div class="instruction">
    <span class="opcode">80</span>
    <span class="mnemonic">
      <span class="operation">ADD</span>
      <span class="operands">B</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">81</span>
    <span class="mnemonic">
      <span class="operation">ADD</span>
      <span class="operands">C</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">82</span>
    <span class="mnemonic">
      <span class="operation">ADD</span>
      <span class="operands">D</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">83</span>
    <span class="mnemonic">
      <span class="operation">ADD</span>
      <span class="operands">E</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">84</span>
    <span class="mnemonic">
      <span class="operation">ADD</span>
      <span class="operands">H</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">85</span>
    <span class="mnemonic">
      <span class="operation">ADD</span>
      <span class="operands">L</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">86</span>
    <span class="mnemonic">
      <span class="operation">ADD</span>
      <span class="operands">M</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">87</span>
    <span class="mnemonic">
      <span class="operation">ADD</span>
      <span class="operands">A</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">88</span>
    <span class="mnemonic">
      <span class="operation">ADC</span>
      <span class="operands">B</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">89</span>
    <span class="mnemonic">
      <span class="operation">ADC</span>
      <span class="operands">C</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">8A</span>
    <span class="mnemonic">
      <span class="operation">ADC</span>
      <span class="operands">D</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">8B</span>
    <span class="mnemonic">
      <span class="operation">ADC</span>
      <span class="operands">E</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">8C</span>
    <span class="mnemonic">
      <span class="operation">ADC</span>
      <span class="operands">H</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">8D</span>
    <span class="mnemonic">
      <span class="operation">ADC</span>
      <span class="operands">L</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">8E</span>
    <span class="mnemonic">
      <span class="operation">ADC</span>
      <span class="operands">M</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">8F</span>
    <span class="mnemonic">
      <span class="operation">ADC</span>
      <span class="operands">A</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">90</span>
    <span class="mnemonic">
      <span class="operation">SUB</span>
      <span class="operands">B</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">91</span>
    <span class="mnemonic">
      <span class="operation">SUB</span>
      <span class="operands">C</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">92</span>
    <span class="mnemonic">
      <span class="operation">SUB</span>
      <span class="operands">D</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">93</span>
    <span class="mnemonic">
      <span class="operation">SUB</span>
      <span class="operands">E</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">94</span>
    <span class="mnemonic">
      <span class="operation">SUB</span>
      <span class="operands">H</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">95</span>
    <span class="mnemonic">
      <span class="operation">SUB</span>
      <span class="operands">L</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">96</span>
    <span class="mnemonic">
      <span class="operation">SUB</span>
      <span class="operands">M</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">97</span>
    <span class="mnemonic">
      <span class="operation">SUB</span>
      <span class="operands">A</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">98</span>
    <span class="mnemonic">
      <span class="operation">SBB</span>
      <span class="operands">B</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">99</span>
    <span class="mnemonic">
      <span class="operation">SBB</span>
      <span class="operands">C</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">9A</span>
    <span class="mnemonic">
      <span class="operation">SBB</span>
      <span class="operands">D</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">9B</span>
    <span class="mnemonic">
      <span class="operation">SBB</span>
      <span class="operands">E</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">9C</span>
    <span class="mnemonic">
      <span class="operation">SBB</span>
      <span class="operands">H</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">9D</span>
    <span class="mnemonic">
      <span class="operation">SBB</span>
      <span class="operands">L</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">9E</span>
    <span class="mnemonic">
      <span class="operation">SBB</span>
      <span class="operands">M</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">9F</span>
    <span class="mnemonic">
      <span class="operation">SBB</span>
      <span class="operands">A</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">A0</span>
    <span class="mnemonic">
      <span class="operation">ANA</span>
      <span class="operands">B</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">A1</span>
    <span class="mnemonic">
      <span class="operation">ANA</span>
      <span class="operands">C</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">A2</span>
    <span class="mnemonic">
      <span class="operation">ANA</span>
      <span class="operands">D</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">A3</span>
    <span class="mnemonic">
      <span class="operation">ANA</span>
      <span class="operands">E</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">A4</span>
    <span class="mnemonic">
      <span class="operation">ANA</span>
      <span class="operands">H</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">A5</span>
    <span class="mnemonic">
      <span class="operation">ANA</span>
      <span class="operands">L</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">A6</span>
    <span class="mnemonic">
      <span class="operation">ANA</span>
      <span class="operands">M</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">A7</span>
    <span class="mnemonic">
      <span class="operation">ANA</span>
      <span class="operands">A</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">A8</span>
    <span class="mnemonic">
      <span class="operation">XRA</span>
      <span class="operands">B</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">A9</span>
    <span class="mnemonic">
      <span class="operation">XRA</span>
      <span class="operands">C</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">AA</span>
    <span class="mnemonic">
      <span class="operation">XRA</span>
      <span class="operands">D</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">AB</span>
    <span class="mnemonic">
      <span class="operation">XRA</span>
      <span class="operands">E</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">AC</span>
    <span class="mnemonic">
      <span class="operation">XRA</span>
      <span class="operands">H</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">AD</span>
    <span class="mnemonic">
      <span class="operation">XRA</span>
      <span class="operands">L</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">AE</span>
    <span class="mnemonic">
      <span class="operation">XRA</span>
      <span class="operands">M</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">AF</span>
    <span class="mnemonic">
      <span class="operation">XRA</span>
      <span class="operands">A</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">B0</span>
    <span class="mnemonic">
      <span class="operation">ORA</span>
      <span class="operands">B</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">B1</span>
    <span class="mnemonic">
      <span class="operation">ORA</span>
      <span class="operands">C</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">B2</span>
    <span class="mnemonic">
      <span class="operation">ORA</span>
      <span class="operands">D</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">B3</span>
    <span class="mnemonic">
      <span class="operation">ORA</span>
      <span class="operands">E</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">B4</span>
    <span class="mnemonic">
      <span class="operation">ORA</span>
      <span class="operands">H</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">B5</span>
    <span class="mnemonic">
      <span class="operation">ORA</span>
      <span class="operands">L</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">B6</span>
    <span class="mnemonic">
      <span class="operation">ORA</span>
      <span class="operands">M</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">B7</span>
    <span class="mnemonic">
      <span class="operation">ORA</span>
      <span class="operands">A</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">B8</span>
    <span class="mnemonic">
      <span class="operation">CMP</span>
      <span class="operands">B</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">B9</span>
    <span class="mnemonic">
      <span class="operation">CMP</span>
      <span class="operands">C</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">BA</span>
    <span class="mnemonic">
      <span class="operation">CMP</span>
      <span class="operands">D</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">BB</span>
    <span class="mnemonic">
      <span class="operation">CMP</span>
      <span class="operands">E</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">BC</span>
    <span class="mnemonic">
      <span class="operation">CMP</span>
      <span class="operands">H</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">BD</span>
    <span class="mnemonic">
      <span class="operation">CMP</span>
      <span class="operands">L</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">BE</span>
    <span class="mnemonic">
      <span class="operation">CMP</span>
      <span class="operands">M</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">BF</span>
    <span class="mnemonic">
      <span class="operation">CMP</span>
      <span class="operands">A</span>
    </span>
  </div>
  </div>

  <div class="column">
  <div class="instruction">
    <span class="opcode">C0</span>
    <span class="mnemonic">
      <span class="operation">RNZ</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">C1</span>
    <span class="mnemonic">
      <span class="operation">POP</span>
      <span class="operands">B</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">C2</span>
    <span class="mnemonic">
      <span class="operation">JNZ</span>
      <span class="operands">Adr</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">C3</span>
    <span class="mnemonic">
      <span class="operation">JMP</span>
      <span class="operands">Adr</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">C4</span>
    <span class="mnemonic">
      <span class="operation">CNZ</span>
      <span class="operands">Adr</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">C5</span>
    <span class="mnemonic">
      <span class="operation">PUSH</span>
      <span class="operands">B</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">C6</span>
    <span class="mnemonic">
      <span class="operation">ADI</span>
      <span class="operands">D8</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">C7</span>
    <span class="mnemonic">
      <span class="operation">RST</span>
      <span class="operands">0</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">C8</span>
    <span class="mnemonic">
      <span class="operation">RZ</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">C9</span>
    <span class="mnemonic">
      <span class="operation">RET</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">CA</span>
    <span class="mnemonic">
      <span class="operation">JZ</span>
      <span class="operands">Adr</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">CB</span>
    <span class="mnemonic">
      <span class="operation">--</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">CC</span>
    <span class="mnemonic">
      <span class="operation">CZ</span>
      <span class="operands">Adr</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">CD</span>
    <span class="mnemonic">
      <span class="operation">CALL</span>
      <span class="operands">Adr</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">CE</span>
    <span class="mnemonic">
      <span class="operation">ACI</span>
      <span class="operands">D8</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">CF</span>
    <span class="mnemonic">
      <span class="operation">RST</span>
      <span class="operands">1</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">D0</span>
    <span class="mnemonic">
      <span class="operation">RNC</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">D1</span>
    <span class="mnemonic">
      <span class="operation">POP</span>
      <span class="operands">D</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">D2</span>
    <span class="mnemonic">
      <span class="operation">JNC</span>
      <span class="operands">Adr</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">D3</span>
    <span class="mnemonic">
      <span class="operation">OUT</span>
      <span class="operands">D8</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">D4</span>
    <span class="mnemonic">
      <span class="operation">CNC</span>
      <span class="operands">Adr</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">D5</span>
    <span class="mnemonic">
      <span class="operation">PUSH</span>
      <span class="operands">D</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">D6</span>
    <span class="mnemonic">
      <span class="operation">SUI</span>
      <span class="operands">D8</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">D7</span>
    <span class="mnemonic">
      <span class="operation">RST</span>
      <span class="operands">2</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">D8</span>
    <span class="mnemonic">
      <span class="operation">RC</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">D9</span>
    <span class="mnemonic">
      <span class="operation">--</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">DA</span>
    <span class="mnemonic">
      <span class="operation">JC</span>
      <span class="operands">Adr</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">DB</span>
    <span class="mnemonic">
      <span class="operation">IN</span>
      <span class="operands">D8</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">DC</span>
    <span class="mnemonic">
      <span class="operation">CC</span>
      <span class="operands">Adr</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">DD</span>
    <span class="mnemonic">
      <span class="operation">--</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">DE</span>
    <span class="mnemonic">
      <span class="operation">SBI</span>
      <span class="operands">D8</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">DF</span>
    <span class="mnemonic">
      <span class="operation">RST</span>
      <span class="operands">3</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">E0</span>
    <span class="mnemonic">
      <span class="operation">RPO</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">E1</span>
    <span class="mnemonic">
      <span class="operation">POP</span>
      <span class="operands">H</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">E2</span>
    <span class="mnemonic">
      <span class="operation">JPO</span>
      <span class="operands">Adr</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">E3</span>
    <span class="mnemonic">
      <span class="operation">XTHL</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">E4</span>
    <span class="mnemonic">
      <span class="operation">CPO</span>
      <span class="operands">Adr</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">E5</span>
    <span class="mnemonic">
      <span class="operation">PUSH</span>
      <span class="operands">H</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">E6</span>
    <span class="mnemonic">
      <span class="operation">ANI</span>
      <span class="operands">D8</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">E7</span>
    <span class="mnemonic">
      <span class="operation">RST</span>
      <span class="operands">4</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">E8</span>
    <span class="mnemonic">
      <span class="operation">RPE</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">E9</span>
    <span class="mnemonic">
      <span class="operation">PCHL</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">EA</span>
    <span class="mnemonic">
      <span class="operation">JPE</span>
      <span class="operands">Adr</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">EB</span>
    <span class="mnemonic">
      <span class="operation">XCHG</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">EC</span>
    <span class="mnemonic">
      <span class="operation">CPE</span>
      <span class="operands">Adr</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">ED</span>
    <span class="mnemonic">
      <span class="operation">--</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">EE</span>
    <span class="mnemonic">
      <span class="operation">XRI</span>
      <span class="operands">D8</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">EF</span>
    <span class="mnemonic">
      <span class="operation">RST</span>
      <span class="operands">5</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">F0</span>
    <span class="mnemonic">
      <span class="operation">RP</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">F1</span>
    <span class="mnemonic">
      <span class="operation">POP</span>
      <span class="operands">PSW</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">F2</span>
    <span class="mnemonic">
      <span class="operation">JP</span>
      <span class="operands">Adr</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">F3</span>
    <span class="mnemonic">
      <span class="operation">DI</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">F4</span>
    <span class="mnemonic">
      <span class="operation">CP</span>
      <span class="operands">Adr</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">F5</span>
    <span class="mnemonic">
      <span class="operation">PUSH</span>
      <span class="operands">PSW</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">F6</span>
    <span class="mnemonic">
      <span class="operation">ORI</span>
      <span class="operands">D8</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">F7</span>
    <span class="mnemonic">
      <span class="operation">RST</span>
      <span class="operands">6</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">F8</span>
    <span class="mnemonic">
      <span class="operation">RM</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">F9</span>
    <span class="mnemonic">
      <span class="operation">SPHL</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">FA</span>
    <span class="mnemonic">
      <span class="operation">JM</span>
      <span class="operands">Adr</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">FB</span>
    <span class="mnemonic">
      <span class="operation">EI</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">FC</span>
    <span class="mnemonic">
      <span class="operation">CM</span>
      <span class="operands">Adr</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">FD</span>
    <span class="mnemonic">
      <span class="operation">--</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">FE</span>
    <span class="mnemonic">
      <span class="operation">CPI</span>
      <span class="operands">D8</span>
    </span>
  </div>

  <div class="instruction">
    <span class="opcode">FF</span>
    <span class="mnemonic">
      <span class="operation">RST</span>
      <span class="operands">7</span>
    </span>
  </div>
  </div>
</div>

D8 := constant, or logical/arithmetic expression that evaluates to an 8 bit data quantity.

D16 := constant, or logical/arithmetic expression that evaluates to a 16 bit data quantity

Adr := 16-bit address

<style>
    .instruction-table {
        /*
        column-count: 4;
        column-gap: 0rem;
        */
        display: grid;
        grid-template-columns: repeat(4, 1fr); /* 4 columns */
        max-width: 1000px;
        margin: 0 auto;
        font-family: monospace;
        border-right: 1px solid rgb(75, 85, 99);
        border-top: 1px solid rgb(75, 85, 99);
        border-bottom: 1px solid rgb(75, 85, 99);
    }

    .column {
      margin: 0 !important;
    }

    .instruction {
      display: flex;
      align-items: center;
      gap: 0.2rem;
      padding: 0 0.5rem;
      margin: 0 !important;
      border-left: 1px solid rgb(75, 85, 99);
    }

    .operation {
      min-width: 2rem;
    }

    .operands {
      min-width: 4rem;
    }

    .mnemonic {
      display: flex;
      gap: 0.5rem;
      break-inside: avoid;
      padding: 0.5rem 0.5rem;
      margin-top: 0 !important;
      margin-left: 0.5rem;
      border-left: 1px solid rgb(75, 85, 99);
    }

    .opcode {
      border-radius: 3px;
    }

    .mnemonic {
        text-align: left;
        color: #fff;
        flex-grow: 1;
    }

    .operands {
        color: #00cc66;
    }

    .instruction:nth-child(2n) {
        background-color: #23262f;
    }

    .instruction:nth-child(2n + 1) {
        background-color: #17181c;
    }
</style>
