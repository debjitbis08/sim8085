port module Main exposing (..)

import Html exposing (..)
import Html.Attributes exposing (..)
import Html.App as App
import Html.Events exposing (..)

import Array exposing (..)
import Bitwise exposing (..)
import Char exposing (..)
import String exposing (..)

-- APP
main : Program Never
main =
  App.program { init = init, view = view, update = update, subscriptions = subscriptions }

-- MODEL
type alias Model =
  { code: String
  , assembled: Array Int
  , loadAddr: Int
  , running: Bool
  , debugging: Bool
  , accumulator: Int
  , registers: List Register
  , stackPtr: Int
  , programCounter: Int
  , memory: Array Int
  , memoryStart: Int
  , memoryStartLarge: Int
  , memoryStartSmall: Int
  , flags: List Flag
  , activeFile: String
  , openFiles: List File
  }

init : ( Model, Cmd Msg )
init =
  ( { code = initialCode
    , assembled = Array.empty
    , loadAddr = 1024
    , running = False
    , debugging = False
    , accumulator = 0
    , registers = registers
    , stackPtr = 0
    , programCounter = 0
    , memory = Array.repeat 65536 0
    , memoryStart = 0
    , memoryStartLarge = 0
    , memoryStartSmall = 0
    , flags = flags
    , activeFile = "main.asm"
    , openFiles = [ File "main.asm" "" ]
    }, Cmd.none )

initialCode =
  """
  ;<Program title>

  jmp start

  ;data


  ;code
  start: nop


  hlt
  """

type alias Register =
  { name: String
  , high: Int
  , low: Int
  }

type alias Flag =
  { name: String
  , value: Bool
  }

type alias File =
  { name: String
  , code: String
  }

registers : List Register
registers =
  [ { name = "BC", high = 0, low = 0 }
  , { name = "DE", high = 0, low = 0 }
  , { name = "HL", high = 0, low = 0 }
  ]

flags : List Flag
flags =
  [ { name = "S", value = False }
  , { name = "Z", value = False }
  , { name = "AC", value = False }
  , { name = "P", value = False }
  , { name = "C", value = False }
  ]




-- UPDATE

type Msg
  = Run
  | UpdateCode String
  | UpdateAssembledCode (Array Int)
  | UpdateState ExternalState
  | PreviousMemoryPage
  | NextMemoryPage
  | ChangeMemoryStart String
  | ChangeMemoryStartSmall String

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
  case msg of
    Run -> (model, run model.assembled)
    _ -> ( updateHelper msg model, Cmd.none )

updateHelper : Msg -> Model -> Model
updateHelper msg model =
  case msg of
    UpdateCode code -> { model | code = code }
    UpdateAssembledCode code -> { model | assembled = code }
    UpdateState state ->
      { model | accumulator = state.a
              , registers = readRegistersFromExternalState state
              , flags = readFlagsFromExternalState state
              , stackPtr = state.sp
              , programCounter = state.pc
              , memory = state.memory }
    PreviousMemoryPage -> { model | memoryStart = if model.memoryStart == 0 then 0 else model.memoryStart - 256 }
    NextMemoryPage -> { model | memoryStart = if model.memoryStart == 65536 - 128 then model.memoryStart else model.memoryStart + 256 }
    ChangeMemoryStart v ->
      let
        n = Result.withDefault 0 (String.toInt v)
      in
        { model | memoryStartLarge = n
                , memoryStart = n + model.memoryStartSmall }
    ChangeMemoryStartSmall v ->
      let
        n = Result.withDefault 0 (String.toInt v)
      in
        { model | memoryStartSmall = n
                , memoryStart = n + model.memoryStartLarge }
    _ -> model

readRegistersFromExternalState state =
  [ { name = "BC", high = state.b, low = state.c }
  , { name = "DE", high = state.d, low = state.e }
  , { name = "HL", high = state.h, low = state.l }
  ]

readFlagsFromExternalState state =
  [ { name = "S", value = state.flags.s }
  , { name = "Z", value = state.flags.z }
  , { name = "AC", value = state.flags.ac }
  , { name = "P", value = state.flags.p }
  , { name = "C", value = state.flags.cy }
  ]


-- SUBSCRIPTIONS

subscriptions : Model -> Sub Msg
subscriptions model =
  Sub.batch
    [ code UpdateCode
    , assembled UpdateAssembledCode
    , state UpdateState
    ]


-- VIEW
-- Html is defined as: elem [ attribs ][ children ]
-- CSS can be applied via class names or inline style attrib

view : Model -> Html Msg
view model =
  div [ class "work-area" ] [
      div [ class "row" ] [
        div [ class "col-md-2" ] [
            div [] [
              h3 [] [ text "Registers" ]
            , table [ class "table table-striped" ] [
                tbody [] (
                  showRegister { name = "A", high = 0, low = model.accumulator }
                  :: showRegister { name = "SP", high = (model.stackPtr `shiftRight` 8) `and` 0xff, low = model.stackPtr `and` 0xff }
                  :: showRegister { name = "PC", high = (model.programCounter `shiftRight` 8) `and` 0xff, low = model.programCounter `and` 0xff }
                  :: (List.map showRegister model.registers))
              ]
            ]
          , div [] [
              h3 [] [ text "Flags" ]
            , table [ class "table table-striped" ] [ tbody [] (List.map showFlag model.flags) ]
            ]
        ]
        , div [ class "col-md-5 coding-area" ] [
              div [ class "btn-toolbar coding-area__btn-toolbar" ] [
                div [ class "btn-group" ] [
                  button [ class "btn btn-success", onClick Run, title "Run Program" ] [
                      span [ class "glyphicon glyphicon-play"] []
                  ]
                -- , button [ class "btn" ] [ text "Debug" ]
                ]
              ]
            , ul [ class "nav nav-tabs" ] (List.map (showOpenFileTabs model.activeFile) model.openFiles)
            , div [ class "coding-area__editor-container" ] [
                  textarea [ id "coding-area__editor" ] []
              ]
          ]
        , div [ class "col-md-4" ] [
              div [ class "" ] [ showMemory model.memory model.memoryStart model.memoryStartSmall ]
          ]
      ]
    , div [] [ text <| toString <| model.assembled ]
  ]


showRegister : Register -> Html msg
showRegister { name, high, low } =
  tr [] [
     th [ scope "row" ] [ text name ]
   , td [] [ text <| toString <| high ]
   , td [] [ text <| toString <| low ]
  ]

showFlag : Flag -> Html msg
showFlag { name, value } =
  tr [] [
     th [ scope "row" ] [ text name ]
   , td [] [ text <| toString <| (if value then 1 else 0) ]
  ]


showOpenFileTabs : String -> File -> Html msg
showOpenFileTabs activeFileName { name, code } =
    li [ class (if activeFileName == name then "active" else "") ] [
       a [ href "#" ] [ text name ]
    ]

showMemory memory memoryStart memoryStartSmall =
  div [ class "memory-view" ] [
      h3 [] [ text "Memory View" ]
    , table [ class "table memory-view__cells" ] [
          thead [] (td [] [] :: (List.map (\c -> td [] [ text <| (String.toUpper (toRadix 16 c)) ]) [0..15]))
        , tbody [] (Array.toList (showMemoryCells memoryStart (Array.slice memoryStart (memoryStart + 256) memory)))
      ]
    , div [ class "memory-view___paginator row" ] [
          div [ class "col-sm-6" ] [
              span [ style [("font-size", "0.8em")]] [ text "Start Address at: 0x " ]
            , select [ onInput ChangeMemoryStart ] (List.map (\n -> option [ value <| toString <| n ] [ text (String.toUpper (toRadix 16 n)) ]) (List.map (\n -> n * 4352) [0..15]))
          ]
        , div [ class "col-md-6" ] [
              input [ type' "range"
                    , Html.Attributes.min "0"
                    , Html.Attributes.max "4096"
                    , step "256"
                    , onInput ChangeMemoryStartSmall
                    , value (toString memoryStartSmall)
                    ] []
          ]
      ]
  ]

isEven n = n % 2 == 0

isOdd n = n % 2 /= 0

chunk : Int -> List a -> List (List a)
chunk k xs =
  let len = List.length xs
  in  if len > k
      then List.take k xs :: chunk k (List.drop k xs)
      else [xs]

showMemoryCell : Int -> Int -> Html Msg
showMemoryCell addr cell =
  td [ class (if cell > 0 then "memory-view__cell_highlight" else "memory-view__cell" ) ] [
     text <| String.toUpper <| toByte <| cell
  ]

showMemoryCellRow : Int -> Int -> List Int -> Html Msg
showMemoryCellRow start i cells = tr [] ( (th [ scope "row" ] [ text <| String.toUpper <| toThreeBytes ((start//16) + i) ]) :: (List.map (showMemoryCell i) cells))

showMemoryCells : Int-> Array Int -> Array (Html Msg)
showMemoryCells start cells =
  Array.indexedMap (showMemoryCellRow start) (Array.fromList (chunk 16 (Array.toList cells)))

showScalePoint value =
  li [] [ text <| toString <| value ]

toRadix : Int -> Int -> String
toRadix r n =
  let
    getChr c = if c < 10 then toString c else String.fromChar <| Char.fromCode (87+c)
    getStr b = if n < b then getChr n else (toRadix r (n//b)) ++  (getChr (n%b))
  in
    case (r>=2 && r<=16) of
      True -> getStr r
      False -> toString n

toThreeBytes n =
  if n < 16
    then ("00" ++ toRadix 16 n)
    else if n < 256 then ("0" ++ toRadix 16 n) else (toRadix 16 n)

toByte n =
  if n < 16
    then ("0" ++ toRadix 16 n)
    else (toRadix 16 n)

-- Ports

type alias ExternalState =
  { a: Int
  , b: Int
  , c: Int
  , d: Int
  , e: Int
  , h: Int
  , l: Int
  , sp: Int
  , pc: Int
  , flags:
    { z: Bool
    , s: Bool
    , p: Bool
    , cy: Bool
    , ac: Bool
    }
  , memory: Array Int
  }

port run : Array Int -> Cmd msg

port code : (String -> msg) -> Sub msg
port assembled : (Array Int -> msg) -> Sub msg
port state : (ExternalState -> msg) -> Sub msg
