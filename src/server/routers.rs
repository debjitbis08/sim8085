#[macro_export]
macro_rules! lsp_router{
    (
        $req:ident,$state:ident,$conn:ident,
        {
            $(($method:ident)=>$handler:ident),* $(,)? // optional comma at last ^_^
        }
    ) =>{{

        let mut __req = $req;

        $(
            __req = match lsp_server::cast::<$method>(__req){
                Ok((id,params))=>{
                    let result = $handler(&mut state,params);

                    let result = serde_json::to_value(&result).unwrap();
                    
                    let resp = lsp_server::Response {
                        id,
                        result: Some(result),
                        error: None,
                    }
                    $conn.as_ref().unwrap().sender().send(
                        lsp_server::Message::Response(resp)
                        ).unwrap();

                    continue;
                },
                Err(lsp_server::ExtractError::JsonError { error, .. }) => {
                    panic!("Invalid params for {}: {:?}", stringify!($method), error);
                },

                Err(lsp_server::ExtractError::MethodMismatch(req)) => req,

            }
        )*
    }}
}
