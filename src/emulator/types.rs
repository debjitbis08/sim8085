use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

pub struct Addr {
    pub high: u8,
    pub low: u8
}

#[wasm_bindgen]
#[derive(Copy, Clone, Serialize, Deserialize, Debug)]
pub struct Flags {
	pub z: bool, // 1 bit
	pub s: bool, // 1 bit
	pub p: bool, // 1 bit
	pub cy: bool, // 1 bit
    pub ac: bool, // 1 bit

    // pad: 3, // 3 bits
    // Total: 8 bits
}

#[wasm_bindgen]
#[derive(Copy, Clone, Serialize, Deserialize, Debug)]
pub struct Cpu {
    pub a: u8,
    pub b: u8,
    pub c: u8,
    pub d: u8,
    pub e: u8,
    pub h: u8,
    pub l: u8,
    pub sp: u16,
    pub pc: u16,
    pub cc: Flags,
    pub int_enable: u8,
}

pub struct State8085 {
    pub cpu: Cpu,
    pub memory: &'static mut [u8; 65536],
}

impl State8085 {
    pub fn read_memory(&self, offset: usize) -> u8 {
        self.memory[offset]
    }

    pub fn write_memory(&mut self, offset: usize, byte: u8) {
        self.memory[offset] = byte;
    }
}

pub enum Registers { A, B, C, D, E, H, L }

// This is specified as REGM8 in the 8085 manual
pub enum RegM { A, B, C, D, E, H, L, M }

// This is specified as REG16 in the 8085 manual
pub enum RegPair { B, D, H, SP }
