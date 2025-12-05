#[macro_export]
macro_rules! lsp_router {
    (
        $req:ident, $state:ident, {
            $( $method:ty => $handler:path ),* $(,)?
        }
    ) => {{
$(
                let __req = match cast::<$method>($req) {
                    Ok((id, params)) => {
                        let resp = Response {
                            result: Some($handler(&id,params)),
                            id,
                            error: None,
                        };
                        $state.conn.as_ref().unwrap().sender.send(Message::Response(resp))?;
                        return Ok(())
                    }
                    Err(err @ ExtractError::JsonError { .. }) => panic!("{:?}", err),
                    Err(ExtractError::MethodMismatch(req)) => req,
                };
)*
    }};
}
