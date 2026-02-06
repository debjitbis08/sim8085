use lsp_server::{ExtractError, Request, RequestId};
use serde::de::DeserializeOwned;

pub fn cast<R>(req: Request) -> Result<(RequestId, R::Params), ExtractError<Request>>
where
    R: lsp_types::request::Request,
    R::Params: serde::de::DeserializeOwned,
{
    req.extract(R::METHOD)
}

#[macro_export]
macro_rules! wasm_lsp_router {
    (
        $req:ident, {
            $( $method:ty => $handler:path ),* $(,)?
        }
    ) => {{
        use crate::server::routers::cast;

$(
                let $req = match cast::<$method>($req) {
                    Ok((id, params)) => {
                        let resp = Response {
                            result: Some(
                                        serde_wasm_bindgen::from_value( $handler( &id ,&params).expect("[ERROR] Failure in communication!"))?) ,
                            id,
                            error: None,
                        };
                        return Ok(serde_wasm_bindgen::to_value(&resp)?);
                    },
                    Err(err @ ExtractError::JsonError { .. }) => panic!("{:?}", err),
                    Err(ExtractError::MethodMismatch(req)) => req,
                };
)*
    }};
}

#[macro_export]
macro_rules! lsp_router {
    (
        $req:ident, $state:ident, {
            $( $method:ty => $handler:path ),* $(,)?
        }
    ) => {{
        use crate::server::routers::cast;

$(
                let $req = match cast::<$method>($req) {
                    Ok((id, params)) => {
                        let resp = Response {
                            result: Some($handler(&id,params).expect("[ERROR] Expected non-empty response")),
                            id,
                            error: None,
                        };
                        eprintln!("{:?}",resp);
                        $state.conn.as_ref().expect("[ERROR] Expected valid connection!").sender.send(Message::Response(resp));
                        continue;
                    },
                    Err(err @ ExtractError::JsonError { .. }) => panic!("{:?}", err),
                    Err(ExtractError::MethodMismatch(req)) => req,
                };
)*
    }};
}
