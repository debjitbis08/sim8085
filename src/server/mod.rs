use lsp_server::{Connection,Message,Notification,Request,IoThreads};
use lsp_types::{InitializeParams,ClientCapabilities,ServerCapabilities,CompletionOptions};
use std::error::{Error};


pub struct lsp85{
   conn: Option<Connection>,
   io_threads: Option<IoThreads>,
   client_cap: Option<ClientCapabilities>,
   server_cap: Option<ServerCapabilities>, 
}


// builder methods 
impl lsp85{
    pub fn builder()->Self{
        return Self{
            conn:None,
            io_threads:None,
            client_cap:None,
            server_cap:None,
        }
    }

    pub fn stdio(mut self)-> Self{
        let (conn,io_threads) = Connection::stdio();

        self.conn = Some(conn);
        self.io_threads = Some(io_threads);
        self.populate_client_cap();

        self 
        }

    pub fn populate_client_cap(&mut self){
        let (id,params) = self.conn.as_ref().unwrap()
            .initialize_start()
            .expect("[ERROR] Failed to initialize server!");

        let init_params: InitializeParams =  serde_json::from_value(params).expect("[[ERROR] Failed to parse initialization params!");
        self.client_cap = Some(init_params.capabilities);
    }

}


