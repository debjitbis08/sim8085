use lsp_server::{Request, RequestId, ExtractError};
use serde::de::DeserializeOwned;

pub fn cast<R>(req: Request) -> Result<(RequestId, R::Params), ExtractError<Request>>
where
    R: lsp_types::request::Request,
    R::Params: serde::de::DeserializeOwned,
{
    req.extract(R::METHOD)
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
                            result: Some(serde_json::Value($handler(&id,params))),
                            id,
                            error: None,
                        };
                        $state.conn.as_ref().expect("[ERROR] Expected valid connection!").sender.send(Message::Response(resp))?;
                        continue;
                    },
                    Err(err @ ExtractError::JsonError { .. }) => panic!("{:?}", err),
                    Err(ExtractError::MethodMismatch(req)) => req,
                };
)*
    }};
}
