#[macro_use]
pub mod routers;
pub mod completion_items;
pub mod handlers;
pub mod utils;
pub mod bindings;


use lsp_server::{Connection, IoThreads, RequestId};
use lsp_types::{
    ClientCapabilities, CompletionOptions, DiagnosticOptions, HoverProviderCapability,
    InitializeParams, ServerCapabilities,
};
use std::error::Error;

pub struct Lsp85 {
    id: Option<RequestId>,
    pub conn: Option<Connection>,
    pub io_threads: Option<IoThreads>,
    client_cap: Option<ClientCapabilities>,
    server_cap: Option<ServerCapabilities>,
}

// builder methods
impl Lsp85 {
    pub fn build() -> Self {
        return Self {
            id: None,
            conn: None,
            io_threads: None,
            client_cap: None,
            server_cap: Some(ServerCapabilities::default()),
        };
    }

    pub fn stdio(mut self) -> Self {
        let (conn, io_threads) = Connection::stdio();

        self.conn = Some(conn);
        self.io_threads = Some(io_threads);
        self.populate_client_cap();

        self
    }

    // expects self.connection defined before hand
    fn populate_client_cap(&mut self) {
        match self
            .conn
            .as_ref()
            .expect("[ERROR] Connection not initialized!")
            .initialize_start()
        {
            Ok((id, params)) => {
                self.id = Some(id);

                let init_params: InitializeParams = serde_json::from_value(params)
                    .expect("[[ERROR] Failed to parse initialization params!");
                self.client_cap = Some(init_params.capabilities);
            }
            Err(_) => {
                eprintln!("[ERROR] Failed to initialize LSP");
            }
        }
    }
    pub fn enable_completion(mut self) -> Self {
        self.server_cap
            .as_mut()
            .expect("[ERROR] Expected existing server_cap!")
            .completion_provider = Some(CompletionOptions::default());
        self
    }

    pub fn enable_hover(mut self) -> Self {
        self.server_cap
            .as_mut()
            .expect("[ERROR] Expected existing server_cap!")
            .hover_provider = Some(HoverProviderCapability::Simple(true));
        self
    }
    pub fn enable_diagnostics(mut self) -> Self {
        self.server_cap
            .as_mut()
            .expect("[ERROR] Expected existing server_cap!")
            .diagnostic_provider = Some(lsp_types::DiagnosticServerCapabilities::Options(
            DiagnosticOptions {
                ..Default::default()
            },
        ));
        self
    }

    pub fn enable_signature_help(mut self) -> Self {
        self.server_cap
            .as_mut()
            .expect("[ERROR] Expected existing server_cap!")
            .signature_help_provider = Some(lsp_types::SignatureHelpOptions {
            trigger_characters: Some(vec![" ".to_string(), ",".to_string()]),
            retrigger_characters: None,
            work_done_progress_options: Default::default(),
        });
        self
    }

    // expects self.connection and self.id
    pub fn initialize(self) -> Result<Self, Box<dyn Error + Sync + Send>> {
        let initialize_data = serde_json::json!({
            "capabilities": self.server_cap,
            "serverInfo": {
                "name":"lsp85",
                "version":"0.1",
            }
        });

        self.conn
            .as_ref()
            .expect("[ERROR] Expected populated connection!")
            .initialize_finish(
                self.id.as_ref().expect("Expected populated id!").clone(),
                initialize_data,
            )?;
        Ok(self)
    }
}
