port module Main exposing (..)

import Html exposing (..)
import Html.Attributes exposing (..)
import Html.App as App
import Html.Events exposing (..)

import Array exposing (..)
import Bitwise exposing (..)
import Char exposing (..)
import String exposing (..)

type ProgramState
  = Idle
  | Loaded
  | Running
  | Paused

-- APP
main : Program Never
main =
  App.program { init = init, view = view, update = update, subscriptions = subscriptions }

-- MODEL
type alias Model =
  { code: String
  , error: Maybe AssemblerError
  , assembled: Array AssembledCode
  , breakpoints: List Int
  , loadAddr: Int
  , programState: ProgramState
  , accumulator: Int
  , registers: Register
  , stackPtr: Int
  , programCounter: Int
  , statePtr: Maybe Int
  , memory: Array Int
  , memoryStart: Int
  , memoryStartLarge: Int
  , memoryStartSmall: Int
  , flags: Flags
  , activeFile: String
  , openFiles: List File
  }

init : ( Model, Cmd Msg )
init =
  ( { code = initialCode
    , error = Nothing
    , assembled = Array.empty
    , breakpoints = []
    , loadAddr = 2048
    , programState = Idle
    , accumulator = 0
    , registers = registers
    , stackPtr = 0
    , programCounter = 0
    , statePtr = Nothing
    , memory = Array.repeat 65536 0
    , memoryStart = 0
    , memoryStartLarge = 0
    , memoryStartSmall = 0
    , flags = flags
    , activeFile = "main.asm"
    , openFiles = [ File "main.asm" "" ]
    }, Cmd.none )

initialCode =
  """;<Program title>

jmp start

;data

;code
start: nop


hlt"""

type alias RegisterValue =
  { high: Int, low: Int }

type alias Register =
  { bc: RegisterValue
  , de: RegisterValue
  , hl: RegisterValue
  }

type alias Flags =
  { s: Bool
  , z: Bool
  , ac: Bool
  , p: Bool
  , c: Bool
  }

type alias File =
  { name: String
  , code: String
  }

registers : Register
registers =
  { bc = { high = 0, low = 0 }
  , de = { high = 0, low = 0 }
  , hl = { high = 0, low = 0 }
  }

flags : Flags
flags =
  { s = False
  , z = False
  , ac = False
  , p = False
  , c = False
  }




-- UPDATE

type Msg
  = Run
  | RunOne
  | Load
  | UpdateCode String
  | UpdateAssembledCode (Array AssembledCode)
  | UpdateAssemblerError AssemblerError
  | UpdateState ExternalState
  | PreviousMemoryPage
  | NextMemoryPage
  | ChangeMemoryStart String
  | ChangeMemoryStartSmall String
  | UpdateBreakpoints BreakPointAction

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
  case msg of
    Run -> (model, run { assembled = (Array.map (.data) model.assembled), state = createExternalStateFromModel model })
    RunOne ->
      if model.programState == Loaded
      then
        ({ model | programState = Paused, programCounter = model.loadAddr }
        , debug { state = (let s = createExternalStateFromModel model in { s | pc = model.loadAddr })
                , nextLine = case findLineAtPC (model.programCounter) model.assembled model.memory of
                              Nothing -> model.programCounter - model.loadAddr
                              Just l -> l }
        )
      else
      (
        { model | programState = Running }
      , runOne { state = createExternalStateFromModel model }
      )
    Load -> (model, load { offset = model.loadAddr, code = model.code })
    UpdateState state ->
      ({ model | accumulator = state.a
              , registers = readRegistersFromExternalState state
              , flags = readFlagsFromExternalState state
              , stackPtr = state.sp
              , programCounter = state.pc
              , statePtr = state.ptr
              , programState =
                  case state.programState of
                    "Loaded" -> Loaded
                    "Idle" -> Idle
                    "Running" -> Idle
                    "Paused" -> Paused
                    _ -> Idle
              , memory = state.memory }
      , if state.programState == "Paused"
        then nextLine (case findLineAtPC (state.pc) model.assembled model.memory of
                        Nothing -> model.programCounter - model.loadAddr
                        Just l -> l)
        else Cmd.none )
    _ -> ( updateHelper msg model, Cmd.none )

updateHelper : Msg -> Model -> Model
updateHelper msg model =
  case msg of
    UpdateCode code -> { model | code = code }
    UpdateAssembledCode code -> { model | assembled = code, error = Nothing }
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
    UpdateAssemblerError e -> { model | error = Just e, assembled = Array.empty }
    UpdateBreakpoints ba ->
      { model | breakpoints = if ba.action == "add"
                              then  ba.line :: model.breakpoints
                              else List.filter (\b -> b /= ba.line) model.breakpoints }
    _ -> model

findLineAtPC pc assembled memory =
  let
    opcode = Array.get pc memory
  in
    case opcode of
      Nothing -> Nothing
      Just code ->
        case Array.get 0 (Array.filter (\c -> c.data == code) assembled) of
          Nothing -> Nothing
          Just a -> Just a.location.start.line

readRegistersFromExternalState state =
  { bc = { high = state.b, low = state.c }
  , de = { high = state.d, low = state.e }
  , hl = { high = state.h, low = state.l }
  }

readFlagsFromExternalState state =
  { s = state.flags.s
  , z = state.flags.z
  , ac = state.flags.ac
  , p = state.flags.p
  , c = state.flags.cy
  }

createExternalStateFromModel model =
  { a = model.accumulator
  , b = model.registers.bc.high
  , c = model.registers.bc.low
  , d = model.registers.de.high
  , e = model.registers.de.low
  , h = model.registers.hl.high
  , l = model.registers.hl.low
  , sp = model.stackPtr
  , pc = model.programCounter
  , flags =
    { z = model.flags.s
    , s = model.flags.z
    , p = model.flags.p
    , cy = model.flags.c
    , ac = model.flags.ac
    }
  , memory = model.memory
  , ptr = model.statePtr
  , programState = getProgramState model.programState
  }

getProgramState programState =
  case programState of
    Idle -> "Idle"
    Loaded -> "Loaded"
    Running -> "Running"
    Paused -> "Paused"





-- SUBSCRIPTIONS

subscriptions : Model -> Sub Msg
subscriptions model =
  Sub.batch
    [ code UpdateCode
    , assembled UpdateAssembledCode
    , state UpdateState
    , error UpdateAssemblerError
    , breakpoints UpdateBreakpoints
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
                tbody [] (showRegisters model.accumulator model.registers model.stackPtr model.programCounter)
              ]
            ]
          , div [] [
              h3 [] [ text "Flags" ]
            , table [ class "table table-striped" ] [ tbody [] (showFlags model.flags) ]
            ]
        ]
        , div [ class "col-md-5 coding-area" ] [
              div [ class "coding-area__toolbar"] [
                  div [ class "btn-toolbar coding-area__btn-toolbar" ] [
                      div [ class "btn-group" ] [
                          toolbarButton (model.programState /= Idle) "success" Load "Assemble and Load Program" "save"
                        , toolbarButton (model.programState /= Loaded) "success" Run "Run Program" "fast-forward"
                        , toolbarButton (model.programState /= Loaded && model.programState /= Paused)
                                        "success" RunOne "Run one instruction" "step-forward"
                      ]
                    , div [ class "btn-group" ] [
                        toolbarButton (model.programState == Idle) "danger" Run "Reset Everything" "refresh"
                      ]
                  ]
                , div [ class "pull-right" ] [
                      text "Load at "
                    , text "0x0800"
                  ]
              ]
            , ul [ class "nav nav-tabs" ]
                 (List.append (List.map (showOpenFileTabs model.activeFile) model.openFiles) [tabAddButton])
            , div [ class "coding-area__editor-container" ] [
                  textarea [ id "coding-area__editor", value model.code ] []
              ]
          ]
        , div [ class "col-md-4" ] [
              div [ class "" ] [ showMemory model.memory model.memoryStart model.memoryStartSmall ]
          ]
      ]
    , div [ class "row" ] [
          div [ class "col-md-7" ] [
              div [ class "panel panel-default" ] [
                  div [ class "panel-heading" ] [ h3 [ class "panel-title" ] [ text "Assembler Output" ] ]
                , div [ class "panel-body" ] [
                      case model.error of
                        Nothing -> (showAssembled model.assembled model.code)
                        Just error -> showAssemblerError error model.code
                  ]
              ]
          ]
      ]
  ]


toolbarButton isDisabled type' msg tooltip icon =
    button [ class ("btn  btn-sm btn-" ++ type'), onClick msg, title tooltip, disabled isDisabled ] [
        span [ class ("glyphicon glyphicon-" ++ icon) ] []
    ]

tabAddButton =
    li [ class "" ] [
       button [ class "btn" ] [ span [ class "glyphicon glyphicon-plus" ] [] ]
    ]

showAssemblerError error code =
  text ("Line " ++ (toString error.line) ++ ", Column " ++ (toString error.column) ++ ": " ++ error.msg)

zipAssembledSource assembled source =
  let
    sourceLines = Array.fromList (String.split "\n" source)
    findAssembled ln =
      Array.map (\a -> { data = a.data, kind = a.kind }) (Array.filter (\c -> (c.location.start.line - 1) == ln) assembled)
  in
    Array.indexedMap (\i s -> (findAssembled i, s)) sourceLines

showAssembled assembled source =
  let
    ls = zipAssembledSource assembled source
    showSingleLine l =
      tr [] [
          td [] [ text  <| showCode (fst l) ]
        , td [] [ text (snd l) ]
      ]
  in
    table [ class "table" ] [ tbody [] (Array.toList (Array.map showSingleLine ls)) ]

showCode codes =
  let
    code = Array.map (.data) (Array.filter (\c -> c.kind == "code") codes)
    data = Array.map (.data) (Array.filter (\c -> c.kind /= "code") codes)
  in
    (String.toUpper <| toRadix 16 <| (Maybe.withDefault 0 (Array.get 0 code))) ++ "  " ++
      (Array.foldr (\a b -> (toString a) ++ " " ++ b) "" data)

showRegister name { high, low } =
  tr [] [
     th [ scope "row" ] [ text name ]
   , td [] [ span [] [ text <| toString <| high ] ]
   , td [] [ span [] [ text <| toString <| low ] ]
  ]

showRegisters accumulator registers stackPtr programCounter =
  [ showRegister "A" { high = 0, low = accumulator }
  , showRegister "BC" registers.bc
  , showRegister "DE" registers.de
  , showRegister "HL" registers.hl
  , showRegister "SP" { high = (stackPtr `shiftRight` 8) `and` 0xff, low = stackPtr `and` 0xff }
  , showRegister "PC" { high = (programCounter `shiftRight` 8) `and` 0xff, low = programCounter `and` 0xff }
  ]

showFlag : String -> Bool -> Html msg
showFlag name value =
  tr [] [
     th [ scope "row" ] [ text name ]
   , td [] [ text <| toString <| (if value then 1 else 0) ]
  ]

showFlags : Flags -> List (Html msg)
showFlags flags =
  [ showFlag "Z" flags.z
  , showFlag "S" flags.s
  , showFlag "P" flags.p
  , showFlag "C" flags.c
  , showFlag "AC" flags.ac
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
  , ptr: Maybe Int
  , programState: String
  }

type alias CodeLocation =
  { offset: Int
  , line: Int
  , column: Int
  }

type alias AssembledCode =
  { data: Int
  , kind: String
  , location: { start: CodeLocation, end: CodeLocation }
  }

type alias AssemblerError =
  { name: String
  , msg: String
  , line: Int
  , column: Int
  }

type alias BreakPointAction =
  { action: String
  , line: Int
  }

port load : { offset: Int, code: String } -> Cmd msg
port run : { assembled: Array Int, state: ExternalState } -> Cmd msg
port runOne : { state: ExternalState } -> Cmd msg
port debug : { state: ExternalState, nextLine: Int } -> Cmd msg
port nextLine : Int -> Cmd msg

port code : (String -> msg) -> Sub msg
port assembled : (Array AssembledCode -> msg) -> Sub msg
port error : (AssemblerError -> msg) -> Sub msg
port state : (ExternalState -> msg) -> Sub msg
port breakpoints : (BreakPointAction -> msg) -> Sub msg
